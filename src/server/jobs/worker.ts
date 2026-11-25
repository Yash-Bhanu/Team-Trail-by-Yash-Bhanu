// Background Worker Process (run via `npm run worker`)
import { claimNextJob, markJobCompleted, markJobFailed } from './queue';
import { db } from '@/server/db';
import { activityEvents, repos, webhookDeliveryReceipts, teamMembers } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { fetchHistoricalRepoMetadata } from '@/server/github/app';
import { aggregateTeamDailyMetrics } from '@/server/metrics/aggregator';
import { createChildLogger } from '@/server/security/logger';

const log = createChildLogger('worker');

let shuttingDown = false;

process.on('SIGINT', () => {
  log.info('Received SIGINT — shutting down gracefully');
  shuttingDown = true;
});

process.on('SIGTERM', () => {
  log.info('Received SIGTERM — shutting down gracefully');
  shuttingDown = true;
});

async function processJob(job: Record<string, unknown>) {
  const jobId = String(job.id);
  const type = String(job.type);
  const payload = (job.payload ?? {}) as Record<string, unknown>;

  if (type === 'process_webhook_event') {
    const receiptId = String(payload.receiptId);
    const repoGithubId = Number(payload.githubRepoId);
    const activityType = payload.activityType as string | null;

    if (repoGithubId && activityType) {
      const repoRecord = await db.query.repos.findFirst({
        where: eq(repos.githubRepoId, repoGithubId),
      });

      if (repoRecord && !repoRecord.unlinkedAt) {
        const actorGithubUserId = payload.actorGithubUserId ? Number(payload.actorGithubUserId) : null;
        let teamMemberId: string | null = null;
        let isAttributed = false;

        if (actorGithubUserId) {
          const member = await db.query.teamMembers.findFirst({
            where: and(
              eq(teamMembers.teamId, repoRecord.teamId),
              eq(teamMembers.githubUserId, actorGithubUserId)
            ),
          });
          if (member) {
            teamMemberId = member.id;
            isAttributed = true;
          }
        }

        await db
          .insert(activityEvents)
          .values({
            repoId: repoRecord.id,
            teamId: repoRecord.teamId,
            activityType: activityType as typeof activityEvents.$inferInsert.activityType,
            githubEventId: String(payload.githubEventId),
            actorGithubUserId,
            actorGithubLogin: payload.actorGithubLogin ? String(payload.actorGithubLogin) : null,
            teamMemberId,
            isBot: Boolean(payload.isBot),
            isAttributed,
            externalUrl: payload.externalUrl ? String(payload.externalUrl) : null,
            prNumber: payload.prNumber ? Number(payload.prNumber) : null,
            issueNumber: payload.issueNumber ? Number(payload.issueNumber) : null,
            eventTimestamp: new Date(String(payload.eventTimestamp)),
            source: 'webhook',
          })
          .onConflictDoNothing();

        await aggregateTeamDailyMetrics(repoRecord.teamId, new Date(String(payload.eventTimestamp)));
      }
    }

    if (receiptId) {
      await db
        .update(webhookDeliveryReceipts)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(webhookDeliveryReceipts.id, receiptId));
    }
    return;
  }

  if (type === 'sync_repo_history') {
    const repoId = String(payload.repoId);
    const repoRecord = await db.query.repos.findFirst({
      where: eq(repos.id, repoId),
      with: { installation: true },
    });

    if (!repoRecord || repoRecord.unlinkedAt) return;

    const [owner, repoName] = repoRecord.githubFullName.split('/');
    if (!owner || !repoName) return;

    await db
      .update(repos)
      .set({ integrationStatus: 'synchronizing' })
      .where(eq(repos.id, repoId));

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const events = await fetchHistoricalRepoMetadata(
      repoRecord.installation.githubInstallationId,
      owner,
      repoName,
      since
    );

    for (const ev of events) {
      let teamMemberId: string | null = null;
      let isAttributed = false;

      if (ev.actorGithubUserId) {
        const member = await db.query.teamMembers.findFirst({
          where: and(
            eq(teamMembers.teamId, repoRecord.teamId),
            eq(teamMembers.githubUserId, ev.actorGithubUserId)
          ),
        });
        if (member) {
          teamMemberId = member.id;
          isAttributed = true;
        }
      }

      await db
        .insert(activityEvents)
        .values({
          repoId: repoRecord.id,
          teamId: repoRecord.teamId,
          activityType: ev.activityType,
          githubEventId: ev.githubEventId,
          actorGithubUserId: ev.actorGithubUserId,
          actorGithubLogin: ev.actorGithubLogin,
          teamMemberId,
          isBot: ev.isBot,
          isAttributed,
          externalUrl: ev.externalUrl,
          prNumber: ev.prNumber,
          issueNumber: ev.issueNumber,
          eventTimestamp: ev.eventTimestamp,
          metadata: ev.metadata,
          source: 'sync',
        })
        .onConflictDoNothing();
    }

    await db
      .update(repos)
      .set({ integrationStatus: 'healthy', lastSyncAt: new Date() })
      .where(eq(repos.id, repoId));

    await aggregateTeamDailyMetrics(repoRecord.teamId, new Date());
    return;
  }

  log.warn({ jobId, type }, 'Unknown job type');
}

async function runWorker() {
  log.info('TeamTrail background worker started');

  while (!shuttingDown) {
    try {
      const job = await claimNextJob(['webhooks', 'sync', 'metrics', 'maintenance']);

      if (!job) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      const jobId = String(job.id);
      const attempts = Number(job.attempts ?? 1);
      const maxAttempts = Number(job.max_attempts ?? 3);

      try {
        await processJob(job);
        await markJobCompleted(jobId);
        log.info({ jobId, type: job.type }, 'Job completed');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        log.error({ jobId, type: job.type, error: msg }, 'Job failed');
        await markJobFailed(jobId, msg, attempts, maxAttempts);
      }
    } catch (err) {
      log.error({ err }, 'Worker loop error');
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  log.info('Worker stopped cleanly');
}

if (require.main === module) {
  runWorker().catch((err) => {
    log.fatal({ err }, 'Worker crashed');
    process.exit(1);
  });
}
