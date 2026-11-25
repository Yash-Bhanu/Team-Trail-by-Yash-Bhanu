import { describe, it, expect } from 'vitest';
import {
  detectTeamInactivity,
  detectNoRecentMerges,
  detectParticipationImbalance,
  detectSlowReviews,
  detectBlockedStudent,
  detectMissingCheckin,
  evaluateAllRisks,
  type RiskContext,
  type Clock,
} from '@/server/metrics/risk-engine';

const fixedNow = new Date('2026-11-25T12:00:00Z');
const fixedClock: Clock = { now: () => fixedNow };

const baseContext: RiskContext = {
  teamId: 'team-1',
  courseId: 'course-1',
  teamName: 'Team Alpha',
  memberCount: 4,
  eligibleMemberCount: 4,
  dataCoverage: 'full',
  syncedSince: new Date('2026-11-01T00:00:00Z'),
};

describe('Deterministic Risk Detection Engine', () => {
  it('flags team inactivity when no eligible events exist in the last 7 days', () => {
    const flag = detectTeamInactivity(
      baseContext,
      {
        events: [
          {
            activityType: 'pr_opened',
            actorGithubUserId: 101,
            actorGithubLogin: 'alice',
            isBot: false,
            isAttributed: true,
            eventTimestamp: new Date('2026-11-10T10:00:00Z'),
          },
        ],
        startDate: new Date('2026-11-01T00:00:00Z'),
        endDate: fixedNow,
      },
      undefined,
      fixedClock
    );

    expect(flag).not.toBeNull();
    expect(flag?.ruleId).toBe('RISK-001');
    expect(flag?.category).toBe('team_inactivity');
  });

  it('does NOT flag team inactivity when dataCoverage is none or minimal', () => {
    const flag = detectTeamInactivity(
      { ...baseContext, dataCoverage: 'minimal' },
      { events: [], startDate: new Date('2026-11-01T00:00:00Z'), endDate: fixedNow },
      undefined,
      fixedClock
    );
    expect(flag).toBeNull();
  });

  it('excludes bot accounts from inactivity and participation checks', () => {
    const flag = detectTeamInactivity(
      baseContext,
      {
        events: [
          {
            activityType: 'pr_opened',
            actorGithubUserId: 999,
            actorGithubLogin: 'dependabot[bot]',
            isBot: true,
            isAttributed: false,
            eventTimestamp: new Date('2026-11-24T10:00:00Z'),
          },
        ],
        startDate: new Date('2026-11-01T00:00:00Z'),
        endDate: fixedNow,
      },
      undefined,
      fixedClock
    );
    expect(flag).not.toBeNull();
    expect(flag?.ruleId).toBe('RISK-001');
  });

  it('flags no recent merges when 8+ days have passed without a PR merge', () => {
    const flag = detectNoRecentMerges(
      baseContext,
      {
        events: [
          {
            activityType: 'pr_merged',
            actorGithubUserId: 101,
            actorGithubLogin: 'alice',
            isBot: false,
            isAttributed: true,
            eventTimestamp: new Date('2026-11-12T10:00:00Z'),
          },
        ],
        startDate: new Date('2026-11-01T00:00:00Z'),
        endDate: fixedNow,
      },
      undefined,
      fixedClock
    );
    expect(flag).not.toBeNull();
    expect(flag?.ruleId).toBe('RISK-002');
  });

  it('flags participation imbalance when one member has >= 80% of >= 10 eligible events', () => {
    const events = [
      ...Array.from({ length: 9 }, (_, i) => ({
        activityType: 'pr_opened',
        actorGithubUserId: 101,
        actorGithubLogin: 'alice',
        isBot: false,
        isAttributed: true,
        eventTimestamp: new Date(`2026-11-20T10:0${i}:00Z`),
      })),
      {
        activityType: 'pr_review_submitted',
        actorGithubUserId: 102,
        actorGithubLogin: 'bob',
        isBot: false,
        isAttributed: true,
        eventTimestamp: new Date('2026-11-21T10:00:00Z'),
      },
    ];

    const flag = detectParticipationImbalance(
      baseContext,
      { events, startDate: new Date('2026-11-01T00:00:00Z'), endDate: fixedNow },
      undefined,
      fixedClock
    );

    expect(flag).not.toBeNull();
    expect(flag?.ruleId).toBe('RISK-003');
    expect(flag?.evidence.topContributorPercentage).toBe(90);
  });

  it('flags slow reviews when PRs wait >= 48 hours for first review', () => {
    const flag = detectSlowReviews(
      baseContext,
      [
        {
          prNumber: 12,
          openedAt: new Date('2026-11-20T00:00:00Z'),
          firstReviewAt: new Date('2026-11-23T00:00:00Z'), // 72h
        },
        {
          prNumber: 13,
          openedAt: new Date('2026-11-21T00:00:00Z'),
          firstReviewAt: null, // > 48h unreviewed
        },
      ],
      undefined,
      fixedClock
    );
    expect(flag).not.toBeNull();
    expect(flag?.ruleId).toBe('RISK-004');
  });

  it('flags blocked student from weekly check-in', () => {
    const flag = detectBlockedStudent(
      baseContext,
      [
        {
          userId: 'u-1',
          userName: 'Alice',
          isBlocked: true,
          blockerDescription: 'Waiting on API credentials',
          confidenceLevel: 2,
          submittedAt: new Date('2026-11-24T15:00:00Z'),
          weekStart: new Date('2026-11-23T00:00:00Z'),
        },
      ],
      fixedClock
    );
    expect(flag).not.toBeNull();
    expect(flag?.ruleId).toBe('RISK-005');
    expect(flag?.severity).toBe('high');
  });

  it('flags missing check-ins only after deadline passes', () => {
    const weekStart = new Date('2026-11-23T00:00:00Z');
    const futureDeadline = new Date('2026-11-27T23:59:00Z');
    const pastDeadline = new Date('2026-11-24T23:59:00Z');

    expect(detectMissingCheckin(baseContext, 4, 2, weekStart, futureDeadline, fixedClock)).toBeNull();

    const flag = detectMissingCheckin(baseContext, 4, 2, weekStart, pastDeadline, fixedClock);
    expect(flag).not.toBeNull();
    expect(flag?.ruleId).toBe('RISK-006');
  });

  it('evaluateAllRisks aggregates multiple flags deterministically', () => {
    const flags = evaluateAllRisks(
      baseContext,
      { events: [], startDate: new Date('2026-11-01T00:00:00Z'), endDate: fixedNow },
      [],
      [],
      4,
      1,
      new Date('2026-11-23T00:00:00Z'),
      new Date('2026-11-24T23:59:00Z'),
      undefined,
      fixedClock
    );
    expect(flags.length).toBeGreaterThanOrEqual(3);
  });
});
