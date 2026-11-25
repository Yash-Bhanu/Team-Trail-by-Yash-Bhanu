// Durable PostgreSQL-backed background job queue — server-only
import 'server-only';

import { db } from '@/server/db';
import { backgroundJobs } from '@/server/db/schema';
import { and, eq, lte, sql } from 'drizzle-orm';

export type JobQueue = 'webhooks' | 'sync' | 'metrics' | 'maintenance';

export interface EnqueueJobInput {
  queue: JobQueue;
  type: string;
  payload: Record<string, unknown>;
  priority?: number;
  maxAttempts?: number;
  scheduledFor?: Date;
}

export async function enqueueJob(input: EnqueueJobInput) {
  const [job] = await db
    .insert(backgroundJobs)
    .values({
      queue: input.queue,
      type: input.type,
      payload: input.payload,
      priority: input.priority ?? 0,
      maxAttempts: input.maxAttempts ?? 3,
      scheduledFor: input.scheduledFor ?? new Date(),
      status: 'pending',
    })
    .returning();
  return job;
}

/**
 * Atomically claim the next available job using FOR UPDATE SKIP LOCKED
 */
export async function claimNextJob(queues: JobQueue[], leaseMs = 60000) {
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + leaseMs);

  // Recover expired leases first
  await db
    .update(backgroundJobs)
    .set({ status: 'pending', leaseExpiresAt: null })
    .where(
      and(
        eq(backgroundJobs.status, 'claimed'),
        lte(backgroundJobs.leaseExpiresAt, now)
      )
    );

  const result = await db.execute(sql`
    UPDATE background_jobs
    SET
      status = 'claimed',
      claimed_at = ${now},
      lease_expires_at = ${leaseExpiresAt},
      attempts = attempts + 1
    WHERE id = (
      SELECT id FROM background_jobs
      WHERE status = 'pending'
        AND scheduled_for <= ${now}
        AND queue = ANY(${queues})
      ORDER BY priority DESC, scheduled_for ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *
  `);

  const rows = result as unknown as Array<Record<string, unknown>>;
  return rows[0] ?? null;
}

export async function markJobCompleted(jobId: string) {
  await db
    .update(backgroundJobs)
    .set({
      status: 'completed',
      completedAt: new Date(),
      leaseExpiresAt: null,
    })
    .where(eq(backgroundJobs.id, jobId));
}

export async function markJobFailed(jobId: string, error: string, attempts: number, maxAttempts: number) {
  if (attempts >= maxAttempts) {
    await db
      .update(backgroundJobs)
      .set({
        status: 'dead',
        lastError: error.slice(0, 1000),
        leaseExpiresAt: null,
      })
      .where(eq(backgroundJobs.id, jobId));
    return;
  }

  // Exponential backoff with jitter
  const baseDelayMs = Math.pow(2, attempts) * 5000;
  const jitterMs = Math.floor(Math.random() * 2000);
  const nextRun = new Date(Date.now() + baseDelayMs + jitterMs);

  await db
    .update(backgroundJobs)
    .set({
      status: 'pending',
      lastError: error.slice(0, 1000),
      scheduledFor: nextRun,
      leaseExpiresAt: null,
    })
    .where(eq(backgroundJobs.id, jobId));
}
