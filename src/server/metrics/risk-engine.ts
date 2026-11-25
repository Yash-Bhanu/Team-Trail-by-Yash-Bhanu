// Deterministic Risk Detection Engine — server-only
// Pure functions with injectable clock for testability
// No AI/ML — all rules are explainable and configurable
import 'server-only';

import type { FlagSeverity } from '@/types';

// ── Types ──────────────────────────────────────────────────

export interface RiskContext {
  teamId: string;
  courseId: string;
  teamName: string;
  memberCount: number;
  eligibleMemberCount: number;
  dataCoverage: 'full' | 'partial' | 'minimal' | 'none';
  syncedSince: Date | null;
}

export interface ActivityWindow {
  events: ActivityRecord[];
  startDate: Date;
  endDate: Date;
}

export interface ActivityRecord {
  activityType: string;
  actorGithubUserId: number | null;
  actorGithubLogin: string | null;
  isBot: boolean;
  isAttributed: boolean;
  eventTimestamp: Date;
  prNumber?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface CheckinRecord {
  userId: string;
  userName: string;
  isBlocked: boolean;
  blockerDescription: string | null;
  confidenceLevel: number;
  submittedAt: Date;
  weekStart: Date;
}

export interface ReviewRecord {
  prNumber: number;
  openedAt: Date;
  firstReviewAt: Date | null;
}

export interface DetectedFlag {
  category: string;
  severity: FlagSeverity;
  title: string;
  explanation: string;
  ruleId: string;
  ruleVersion: string;
  evidence: Record<string, unknown>;
  dataCoverage: string;
  observationStart: Date;
  observationEnd: Date;
  dedupKey: string;
}

export interface RiskConfig {
  inactivityDays: number;
  noMergeDays: number;
  imbalanceThreshold: number;
  imbalanceMinEvents: number;
  imbalanceMinMembers: number;
  slowReviewHours: number;
  minimumCoverageForFlags: 'partial' | 'full';
}

// ── Default configuration ──────────────────────────────────

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  inactivityDays: 7,
  noMergeDays: 8,
  imbalanceThreshold: 0.80,
  imbalanceMinEvents: 10,
  imbalanceMinMembers: 2,
  slowReviewHours: 48,
  minimumCoverageForFlags: 'partial',
};

// ── Clock interface for testability ────────────────────────

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

// ── Risk Detection Rules ───────────────────────────────────

export function detectTeamInactivity(
  context: RiskContext,
  window: ActivityWindow,
  config: RiskConfig = DEFAULT_RISK_CONFIG,
  clock: Clock = systemClock
): DetectedFlag | null {
  // Don't flag if insufficient data coverage
  if (context.dataCoverage === 'none' || context.dataCoverage === 'minimal') {
    return null;
  }

  const now = clock.now();
  const cutoff = new Date(now.getTime() - config.inactivityDays * 24 * 60 * 60 * 1000);

  // Filter out bots
  const eligibleEvents = window.events.filter(e => !e.isBot);

  const recentEvents = eligibleEvents.filter(
    e => e.eventTimestamp >= cutoff
  );

  if (recentEvents.length === 0 && eligibleEvents.length >= 0) {
    // Only flag if we've had the repo long enough
    if (context.syncedSince && context.syncedSince <= cutoff) {
      const daysSinceLastActivity = eligibleEvents.length > 0
        ? Math.floor((now.getTime() - Math.max(...eligibleEvents.map(e => e.eventTimestamp.getTime()))) / (24 * 60 * 60 * 1000))
        : config.inactivityDays;

      return {
        category: 'team_inactivity',
        severity: daysSinceLastActivity >= config.inactivityDays * 2 ? 'high' : 'medium',
        title: 'Team Inactivity Detected',
        explanation: `No eligible GitHub activity detected for ${context.teamName} in the last ${config.inactivityDays} days. This may indicate the team needs support, but could also reflect work happening outside GitHub.`,
        ruleId: 'RISK-001',
        ruleVersion: '1.0',
        evidence: {
          daysSinceLastActivity,
          totalEligibleEvents: eligibleEvents.length,
          observationDays: config.inactivityDays,
          lastActivityDate: eligibleEvents.length > 0
            ? new Date(Math.max(...eligibleEvents.map(e => e.eventTimestamp.getTime()))).toISOString()
            : null,
        },
        dataCoverage: `Coverage: ${context.dataCoverage}. Only GitHub activity visible under current permissions is measured.`,
        observationStart: cutoff,
        observationEnd: now,
        dedupKey: `RISK-001:${context.teamId}:${cutoff.toISOString().split('T')[0]}`,
      };
    }
  }

  return null;
}

export function detectNoRecentMerges(
  context: RiskContext,
  window: ActivityWindow,
  config: RiskConfig = DEFAULT_RISK_CONFIG,
  clock: Clock = systemClock
): DetectedFlag | null {
  if (context.dataCoverage === 'none' || context.dataCoverage === 'minimal') {
    return null;
  }

  const now = clock.now();
  const cutoff = new Date(now.getTime() - config.noMergeDays * 24 * 60 * 60 * 1000);

  const recentMerges = window.events.filter(
    e => e.activityType === 'pr_merged' && e.eventTimestamp >= cutoff && !e.isBot
  );

  if (recentMerges.length === 0) {
    // Check we have enough history
    if (context.syncedSince && context.syncedSince <= cutoff) {
      const allMerges = window.events.filter(e => e.activityType === 'pr_merged' && !e.isBot);
      const lastMergeDate = allMerges.length > 0
        ? new Date(Math.max(...allMerges.map(e => e.eventTimestamp.getTime())))
        : null;

      return {
        category: 'no_recent_merges',
        severity: 'medium',
        title: 'No Recent Pull Request Merges',
        explanation: `No pull request merges detected for ${context.teamName} in the last ${config.noMergeDays} days. Teams may be working in long-running branches or integrating work differently.`,
        ruleId: 'RISK-002',
        ruleVersion: '1.0',
        evidence: {
          daysSinceLastMerge: lastMergeDate
            ? Math.floor((now.getTime() - lastMergeDate.getTime()) / (24 * 60 * 60 * 1000))
            : null,
          totalMerges: allMerges.length,
          observationDays: config.noMergeDays,
          lastMergeDate: lastMergeDate?.toISOString() ?? null,
        },
        dataCoverage: `Coverage: ${context.dataCoverage}. Direct pushes are not visible under current permissions.`,
        observationStart: cutoff,
        observationEnd: now,
        dedupKey: `RISK-002:${context.teamId}:${cutoff.toISOString().split('T')[0]}`,
      };
    }
  }

  return null;
}

export function detectParticipationImbalance(
  context: RiskContext,
  window: ActivityWindow,
  config: RiskConfig = DEFAULT_RISK_CONFIG,
  clock: Clock = systemClock
): DetectedFlag | null {
  if (context.dataCoverage === 'none' || context.dataCoverage === 'minimal') {
    return null;
  }
  if (context.eligibleMemberCount < config.imbalanceMinMembers) {
    return null;
  }

  const now = clock.now();
  // Filter bots and unattributed events
  const eligibleEvents = window.events.filter(e => !e.isBot && e.isAttributed);

  if (eligibleEvents.length < config.imbalanceMinEvents) {
    return null;
  }

  // Count events per contributor
  const contributorCounts = new Map<number, { login: string; count: number }>();
  for (const event of eligibleEvents) {
    if (event.actorGithubUserId) {
      const existing = contributorCounts.get(event.actorGithubUserId);
      if (existing) {
        existing.count++;
      } else {
        contributorCounts.set(event.actorGithubUserId, {
          login: event.actorGithubLogin || 'unknown',
          count: 1,
        });
      }
    }
  }

  if (contributorCounts.size < 2) return null;

  const total = eligibleEvents.length;
  let topContributor: { login: string; count: number; userId: number } | null = null;

  for (const [userId, data] of contributorCounts) {
    if (!topContributor || data.count > topContributor.count) {
      topContributor = { ...data, userId };
    }
  }

  if (topContributor && topContributor.count / total >= config.imbalanceThreshold) {
    const percentage = Math.round((topContributor.count / total) * 100);

    return {
      category: 'participation_imbalance',
      severity: percentage >= 90 ? 'high' : 'medium',
      title: 'Uneven Participation Distribution',
      explanation: `One team member (${topContributor.login}) accounts for ${percentage}% of observed eligible GitHub activity in ${context.teamName}. This metric measures only GitHub activity visible under current permissions and does not represent total student effort.`,
      ruleId: 'RISK-003',
      ruleVersion: '1.0',
      evidence: {
        topContributorLogin: topContributor.login,
        topContributorPercentage: percentage,
        topContributorEvents: topContributor.count,
        totalEligibleEvents: total,
        uniqueContributors: contributorCounts.size,
        breakdown: Array.from(contributorCounts.entries()).map(([id, data]) => ({
          githubUserId: id,
          login: data.login,
          events: data.count,
          percentage: Math.round((data.count / total) * 100),
        })),
      },
      dataCoverage: `Coverage: ${context.dataCoverage}. Observed ${total} eligible events from ${contributorCounts.size} contributors. This does not measure work outside GitHub.`,
      observationStart: window.startDate,
      observationEnd: window.endDate,
      dedupKey: `RISK-003:${context.teamId}:${window.startDate.toISOString().split('T')[0]}`,
    };
  }

  return null;
}

export function detectSlowReviews(
  context: RiskContext,
  reviews: ReviewRecord[],
  config: RiskConfig = DEFAULT_RISK_CONFIG,
  clock: Clock = systemClock
): DetectedFlag | null {
  if (context.dataCoverage === 'none') return null;
  if (reviews.length === 0) return null;

  const now = clock.now();
  const slowReviews = reviews.filter(r => {
    if (!r.firstReviewAt) return false;
    const hoursToReview = (r.firstReviewAt.getTime() - r.openedAt.getTime()) / (1000 * 60 * 60);
    return hoursToReview >= config.slowReviewHours;
  });

  // Also check PRs with no review at all
  const unreviewedPRs = reviews.filter(r => {
    if (r.firstReviewAt) return false;
    const hoursSinceOpen = (now.getTime() - r.openedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceOpen >= config.slowReviewHours;
  });

  const flagWorthy = slowReviews.length + unreviewedPRs.length;

  if (flagWorthy >= 2 || (flagWorthy >= 1 && reviews.length <= 3)) {
    return {
      category: 'slow_reviews',
      severity: unreviewedPRs.length >= 3 ? 'high' : 'medium',
      title: 'Slow or Missing Code Reviews',
      explanation: `${flagWorthy} pull request(s) in ${context.teamName} took more than ${config.slowReviewHours} hours to receive a first review, or remain unreviewed. Timely reviews help maintain code quality and team collaboration.`,
      ruleId: 'RISK-004',
      ruleVersion: '1.0',
      evidence: {
        slowReviewCount: slowReviews.length,
        unreviewedCount: unreviewedPRs.length,
        thresholdHours: config.slowReviewHours,
        totalPRsAnalyzed: reviews.length,
        slowPRNumbers: slowReviews.map(r => r.prNumber),
        unreviewedPRNumbers: unreviewedPRs.map(r => r.prNumber),
      },
      dataCoverage: `Coverage: ${context.dataCoverage}. Only reviews visible through GitHub API are measured.`,
      observationStart: new Date(Math.min(...reviews.map(r => r.openedAt.getTime()))),
      observationEnd: now,
      dedupKey: `RISK-004:${context.teamId}:${now.toISOString().split('T')[0]}`,
    };
  }

  return null;
}

export function detectBlockedStudent(
  context: RiskContext,
  checkins: CheckinRecord[],
  clock: Clock = systemClock
): DetectedFlag | null {
  const now = clock.now();
  const blockedCheckins = checkins.filter(c => c.isBlocked);

  if (blockedCheckins.length === 0) return null;

  // Most recent blocked check-in
  const latestBlocked = blockedCheckins.sort(
    (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime()
  )[0]!;

  return {
    category: 'blocked_student',
    severity: 'high',
    title: 'Student Reports Being Blocked',
    explanation: `A team member in ${context.teamName} reported being blocked in their weekly check-in. Consider reaching out to help unblock them.`,
    ruleId: 'RISK-005',
    ruleVersion: '1.0',
    evidence: {
      blockedStudentName: latestBlocked.userName,
      blockerDescriptionProvided: !!latestBlocked.blockerDescription,
      checkinDate: latestBlocked.submittedAt.toISOString(),
      weekStart: latestBlocked.weekStart.toISOString(),
      totalBlockedThisWeek: blockedCheckins.length,
    },
    dataCoverage: 'Self-reported by student via weekly check-in.',
    observationStart: latestBlocked.weekStart,
    observationEnd: now,
    dedupKey: `RISK-005:${context.teamId}:${latestBlocked.weekStart.toISOString().split('T')[0]}:${latestBlocked.userId}`,
  };
}

export function detectMissingCheckin(
  context: RiskContext,
  expectedCount: number,
  submittedCount: number,
  weekStart: Date,
  deadline: Date,
  clock: Clock = systemClock
): DetectedFlag | null {
  const now = clock.now();

  // Only flag after deadline has passed
  if (now < deadline) return null;

  const missingCount = expectedCount - submittedCount;
  if (missingCount <= 0) return null;

  return {
    category: 'missing_checkin',
    severity: missingCount >= Math.ceil(expectedCount / 2) ? 'high' : 'medium',
    title: 'Missing Weekly Check-ins',
    explanation: `${missingCount} of ${expectedCount} expected check-ins are missing for ${context.teamName} this week. Missing check-ins may indicate disengagement or simply a busy schedule.`,
    ruleId: 'RISK-006',
    ruleVersion: '1.0',
    evidence: {
      expectedCheckins: expectedCount,
      submittedCheckins: submittedCount,
      missingCount,
      weekStart: weekStart.toISOString(),
      deadline: deadline.toISOString(),
    },
    dataCoverage: 'Based on team membership and check-in submission records.',
    observationStart: weekStart,
    observationEnd: now,
    dedupKey: `RISK-006:${context.teamId}:${weekStart.toISOString().split('T')[0]}`,
  };
}

// Run all risk detection rules for a team
export function evaluateAllRisks(
  context: RiskContext,
  activityWindow: ActivityWindow,
  reviews: ReviewRecord[],
  checkins: CheckinRecord[],
  checkinExpected: number,
  checkinSubmitted: number,
  weekStart: Date,
  checkinDeadline: Date,
  config: RiskConfig = DEFAULT_RISK_CONFIG,
  clock: Clock = systemClock
): DetectedFlag[] {
  const flags: DetectedFlag[] = [];

  const inactivity = detectTeamInactivity(context, activityWindow, config, clock);
  if (inactivity) flags.push(inactivity);

  const noMerges = detectNoRecentMerges(context, activityWindow, config, clock);
  if (noMerges) flags.push(noMerges);

  const imbalance = detectParticipationImbalance(context, activityWindow, config, clock);
  if (imbalance) flags.push(imbalance);

  const slowReview = detectSlowReviews(context, reviews, config, clock);
  if (slowReview) flags.push(slowReview);

  for (const checkin of checkins) {
    const blocked = detectBlockedStudent(context, [checkin], clock);
    if (blocked) flags.push(blocked);
  }

  const missingCheckin = detectMissingCheckin(
    context, checkinExpected, checkinSubmitted, weekStart, checkinDeadline, clock
  );
  if (missingCheckin) flags.push(missingCheckin);

  return flags;
}
