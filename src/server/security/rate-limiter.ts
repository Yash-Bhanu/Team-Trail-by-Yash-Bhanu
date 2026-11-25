// Durable rate limiting backed by PostgreSQL — server-only
import 'server-only';

import { db } from '@/server/db';
import { rateLimits } from '@/server/db/schema';
import { and, eq, gte, sql } from 'drizzle-orm';
import { createChildLogger } from '@/server/security/logger';

const log = createChildLogger('rate-limiter');

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  'auth:login': { windowMs: 900000, maxRequests: 10 },        // 15min, 10 attempts
  'invitation:redeem': { windowMs: 3600000, maxRequests: 10 }, // 1hr, 10 attempts
  'checkin:submit': { windowMs: 3600000, maxRequests: 5 },     // 1hr, 5 submissions
  'admin:mutation': { windowMs: 60000, maxRequests: 30 },      // 1min, 30 operations
  'csv:import': { windowMs: 3600000, maxRequests: 5 },         // 1hr, 5 imports
  'export:csv': { windowMs: 60000, maxRequests: 10 },          // 1min, 10 exports
  'api:general': { windowMs: 60000, maxRequests: 100 },        // 1min, 100 requests
  'webhook:github': { windowMs: 60000, maxRequests: 200 },     // 1min, 200 events
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

export async function checkRateLimit(
  identifier: string,
  action: string
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[action] || RATE_LIMIT_CONFIGS['api:general']!;
  const key = `${action}:${identifier}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);
  const resetAt = new Date(now.getTime() + config.windowMs);

  try {
    // Atomic upsert with counting
    await db
      .insert(rateLimits)
      .values({
        key,
        windowStart: now,
        count: 1,
        limit: config.maxRequests,
      })
      .onConflictDoUpdate({
        target: [rateLimits.key, rateLimits.windowStart],
        set: {
          count: sql`${rateLimits.count} + 1`,
        },
        setWhere: gte(rateLimits.windowStart, windowStart),
      })
      .returning();

    // Count total requests in window
    const records = await db
      .select({ totalCount: sql<number>`COALESCE(SUM(${rateLimits.count}), 0)` })
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.key, key),
          gte(rateLimits.windowStart, windowStart)
        )
      );

    const totalCount = Number(records[0]?.totalCount ?? 0);
    const remaining = Math.max(0, config.maxRequests - totalCount);

    return {
      allowed: totalCount <= config.maxRequests,
      remaining,
      resetAt,
      limit: config.maxRequests,
    };
  } catch (error) {
    log.error({ error, key, action }, 'Rate limit check failed — allowing request');
    // Fail open in case of DB error (better than blocking all users)
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt,
      limit: config.maxRequests,
    };
  }
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  };
}
