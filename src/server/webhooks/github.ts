// Secure GitHub Webhook Verification & Metadata Extraction — server-only
// Never persists or logs raw webhook bodies, PR descriptions, or comment text
import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';

export const ALLOWED_WEBHOOK_EVENTS = new Set([
  'pull_request',
  'pull_request_review',
  'pull_request_review_comment',
  'issues',
  'issue_comment',
  'installation',
  'installation_repositories',
]);

export const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024; // 1 MB hard cap

/**
 * Constant-time HMAC SHA-256 verification of X-Hub-Signature-256
 */
export function verifyGitHubSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const expectedSig =
    'sha256=' +
    createHmac('sha256', secret).update(rawBody).digest('hex');

  const sigBuf = Buffer.from(signatureHeader, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');

  if (sigBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(sigBuf, expectedBuf);
}

// Strict schema extracting ONLY approved metadata fields
const senderSchema = z.object({
  id: z.number().int().positive(),
  login: z.string().max(100),
  type: z.string().max(30).optional(),
});

const repositorySchema = z.object({
  id: z.number().int().positive(),
  full_name: z.string().max(200),
});

const installationSchema = z.object({
  id: z.number().int().positive(),
});

export const baseWebhookPayloadSchema = z.object({
  action: z.string().max(60).optional(),
  sender: senderSchema.optional(),
  repository: repositorySchema.optional(),
  installation: installationSchema.optional(),
  pull_request: z
    .object({
      id: z.number().int().positive(),
      number: z.number().int().positive(),
      html_url: z.string().url().optional(),
      merged: z.boolean().optional(),
      created_at: z.string().optional(),
      closed_at: z.string().nullable().optional(),
      merged_at: z.string().nullable().optional(),
    })
    .optional(),
  review: z
    .object({
      id: z.number().int().positive(),
      state: z.string().max(40).optional(),
      html_url: z.string().url().optional(),
      submitted_at: z.string().optional(),
    })
    .optional(),
  issue: z
    .object({
      id: z.number().int().positive(),
      number: z.number().int().positive(),
      html_url: z.string().url().optional(),
      created_at: z.string().optional(),
      closed_at: z.string().nullable().optional(),
    })
    .optional(),
  comment: z
    .object({
      id: z.number().int().positive(),
      html_url: z.string().url().optional(),
      created_at: z.string().optional(),
    })
    .optional(),
});

export type NormalizedWebhookMetadata = {
  deliveryId: string;
  eventType: string;
  action: string | null;
  installationId: number | null;
  githubRepoId: number | null;
  actorGithubUserId: number | null;
  actorGithubLogin: string | null;
  isBot: boolean;
  activityType:
    | 'pr_opened'
    | 'pr_merged'
    | 'pr_closed'
    | 'pr_review_submitted'
    | 'pr_review_comment'
    | 'issue_opened'
    | 'issue_closed'
    | 'issue_comment'
    | null;
  githubEventId: string | null;
  externalUrl: string | null;
  prNumber: number | null;
  issueNumber: number | null;
  eventTimestamp: Date;
};

/**
 * Transiently extract ONLY approved metadata from a verified webhook payload.
 * Discards all body text, diffs, titles, and private fields immediately.
 */
export function extractApprovedWebhookMetadata(
  deliveryId: string,
  eventType: string,
  rawParsed: unknown
): NormalizedWebhookMetadata | null {
  const parsed = baseWebhookPayloadSchema.safeParse(rawParsed);
  if (!parsed.success) return null;

  const data = parsed.data;
  const action = data.action ?? null;
  const isBot =
    data.sender?.type === 'Bot' ||
    (data.sender?.login?.endsWith('[bot]') ?? false);

  let activityType: NormalizedWebhookMetadata['activityType'] = null;
  let githubEventId: string | null = null;
  let externalUrl: string | null = null;
  const prNumber: number | null = data.pull_request?.number ?? null;
  const issueNumber: number | null = data.issue?.number ?? null;
  let eventTimestamp = new Date();

  if (eventType === 'pull_request' && data.pull_request) {
    if (action === 'opened') activityType = 'pr_opened';
    else if (action === 'closed' && data.pull_request.merged) activityType = 'pr_merged';
    else if (action === 'closed') activityType = 'pr_closed';
    githubEventId = `wh-pr-${data.pull_request.id}-${action ?? 'unknown'}`;
    externalUrl = data.pull_request.html_url ?? null;
    const ts = data.pull_request.merged_at ?? data.pull_request.closed_at ?? data.pull_request.created_at;
    if (ts) eventTimestamp = new Date(ts);
  } else if (eventType === 'pull_request_review' && data.review && data.pull_request) {
    if (action === 'submitted') activityType = 'pr_review_submitted';
    githubEventId = `wh-rev-${data.review.id}`;
    externalUrl = data.review.html_url ?? null;
    if (data.review.submitted_at) eventTimestamp = new Date(data.review.submitted_at);
  } else if (eventType === 'pull_request_review_comment' && data.comment && data.pull_request) {
    if (action === 'created') activityType = 'pr_review_comment';
    githubEventId = `wh-revc-${data.comment.id}`;
    externalUrl = data.comment.html_url ?? null;
    if (data.comment.created_at) eventTimestamp = new Date(data.comment.created_at);
  } else if (eventType === 'issues' && data.issue) {
    if (action === 'opened') activityType = 'issue_opened';
    else if (action === 'closed') activityType = 'issue_closed';
    githubEventId = `wh-iss-${data.issue.id}-${action ?? 'unknown'}`;
    externalUrl = data.issue.html_url ?? null;
    const ts = data.issue.closed_at ?? data.issue.created_at;
    if (ts) eventTimestamp = new Date(ts);
  } else if (eventType === 'issue_comment' && data.comment && data.issue) {
    if (action === 'created') activityType = 'issue_comment';
    githubEventId = `wh-issc-${data.comment.id}`;
    externalUrl = data.comment.html_url ?? null;
    if (data.comment.created_at) eventTimestamp = new Date(data.comment.created_at);
  }

  return {
    deliveryId,
    eventType,
    action,
    installationId: data.installation?.id ?? null,
    githubRepoId: data.repository?.id ?? null,
    actorGithubUserId: data.sender?.id ?? null,
    actorGithubLogin: data.sender?.login ?? null,
    isBot,
    activityType,
    githubEventId,
    externalUrl,
    prNumber,
    issueNumber,
    eventTimestamp,
  };
}
