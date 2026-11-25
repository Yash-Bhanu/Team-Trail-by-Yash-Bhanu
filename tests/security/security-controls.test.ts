import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import {
  verifyGitHubSignature,
  extractApprovedWebhookMetadata,
} from '@/server/webhooks/github';
import { sanitizeCsvCell } from '@/lib/utils';
import { checkinSchema } from '@/lib/validations';

describe('Security Controls', () => {
  it('verifies valid GitHub HMAC SHA-256 webhook signatures and rejects forged ones', () => {
    const secret = 'test-webhook-secret-123';
    const body = JSON.stringify({ action: 'opened', sender: { id: 1, login: 'alice' } });
    const validSig = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

    expect(verifyGitHubSignature(body, validSig, secret)).toBe(true);
    expect(verifyGitHubSignature(body, 'sha256=deadbeef', secret)).toBe(false);
    expect(verifyGitHubSignature(body, null, secret)).toBe(false);
    expect(verifyGitHubSignature(body + ' ', validSig, secret)).toBe(false);
  });

  it('strips sensitive PR/comment body text when extracting webhook metadata', () => {
    const payload = {
      action: 'opened',
      sender: { id: 42, login: 'student1', type: 'User' },
      repository: { id: 1001, full_name: 'org/repo' },
      installation: { id: 55 },
      pull_request: {
        id: 777,
        number: 5,
        body: 'SECRET PRIVATE DISCUSSION TEXT THAT MUST NOT BE STORED',
        html_url: 'https://github.com/org/repo/pull/5',
        created_at: '2026-11-24T10:00:00Z',
      },
    };

    const extracted = extractApprovedWebhookMetadata('deliv-1', 'pull_request', payload);
    expect(extracted).not.toBeNull();
    expect(extracted?.activityType).toBe('pr_opened');
    expect(JSON.stringify(extracted)).not.toContain('SECRET PRIVATE DISCUSSION TEXT');
  });

  it('neutralizes CSV spreadsheet formula injection payloads', () => {
    expect(sanitizeCsvCell('=CMD("calc")')).toBe("'=CMD(\"calc\")");
    expect(sanitizeCsvCell('+1+1')).toBe("'+1+1");
    expect(sanitizeCsvCell('-2+3')).toBe("'-2+3");
    expect(sanitizeCsvCell('@SUM(A1:A2)')).toBe("'@SUM(A1:A2)");
    expect(sanitizeCsvCell('Normal Team')).toBe('Normal Team');
  });

  it('rejects out-of-range check-in confidence values', () => {
    expect(
      checkinSchema.safeParse({
        completedWork: 'Worked on API',
        isBlocked: false,
        confidenceLevel: 6,
      }).success
    ).toBe(false);

    expect(
      checkinSchema.safeParse({
        completedWork: 'Worked on API',
        isBlocked: false,
        confidenceLevel: 4,
      }).success
    ).toBe(true);
  });
});
