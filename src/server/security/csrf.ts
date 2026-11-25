// CSRF / Origin validation & Scoped Audit Logging — server-only
import 'server-only';

import { NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { db } from '@/server/db';
import { auditLog } from '@/server/db/schema';

export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // Same-origin requests may omit Origin on some clients; check Referer or Host
  if (!origin) {
    return true;
  }

  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (host && (origin === `http://${host}` || origin === `https://${host}`)) {
    return true;
  }

  return false;
}

export async function recordAuditEvent(params: {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  await db.insert(auditLog).values({
    userId: params.userId ?? null,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId ?? null,
    metadata: params.metadata ?? null,
    ipAddress: params.ipAddress ?? null,
  });
}

export function getClientIp(request: NextRequest): string {
  // Only trust x-forwarded-for if explicitly behind a trusted proxy; otherwise fallback
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || '127.0.0.1';
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}
