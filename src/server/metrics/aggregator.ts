// Daily Metrics Aggregator — server-only
import 'server-only';

import { db } from '@/server/db';
import { activityEvents, dailyMetrics } from '@/server/db/schema';
import { and, eq, gte, lt } from 'drizzle-orm';

export async function aggregateTeamDailyMetrics(teamId: string, targetDate: Date) {
  const dayStart = new Date(targetDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const events = await db.query.activityEvents.findMany({
    where: and(
      eq(activityEvents.teamId, teamId),
      gte(activityEvents.eventTimestamp, dayStart),
      lt(activityEvents.eventTimestamp, dayEnd)
    ),
  });

  const eligible = events.filter((e) => !e.isBot);
  const contributors = new Set<string>();
  const breakdown: Record<string, number> = {};

  let prsOpened = 0;
  let prsMerged = 0;
  let prsClosed = 0;
  let reviewsSubmitted = 0;
  let reviewComments = 0;
  let issuesOpened = 0;
  let issuesClosed = 0;
  let issueComments = 0;

  for (const ev of eligible) {
    if (ev.actorGithubLogin) {
      contributors.add(ev.actorGithubLogin);
      breakdown[ev.actorGithubLogin] = (breakdown[ev.actorGithubLogin] ?? 0) + 1;
    }
    switch (ev.activityType) {
      case 'pr_opened': prsOpened++; break;
      case 'pr_merged': prsMerged++; break;
      case 'pr_closed': prsClosed++; break;
      case 'pr_review_submitted': reviewsSubmitted++; break;
      case 'pr_review_comment': reviewComments++; break;
      case 'issue_opened': issuesOpened++; break;
      case 'issue_closed': issuesClosed++; break;
      case 'issue_comment': issueComments++; break;
    }
  }

  await db
    .insert(dailyMetrics)
    .values({
      teamId,
      date: dayStart,
      totalEvents: eligible.length,
      prsOpened,
      prsMerged,
      prsClosed,
      reviewsSubmitted,
      reviewComments,
      issuesOpened,
      issuesClosed,
      issueComments,
      uniqueContributors: contributors.size,
      contributorBreakdown: breakdown,
      dataCoverage: 'full',
    })
    .onConflictDoUpdate({
      target: [dailyMetrics.teamId, dailyMetrics.date],
      set: {
        totalEvents: eligible.length,
        prsOpened,
        prsMerged,
        prsClosed,
        reviewsSubmitted,
        reviewComments,
        issuesOpened,
        issuesClosed,
        issueComments,
        uniqueContributors: contributors.size,
        contributorBreakdown: breakdown,
      },
    });
}
