// Secure GitHub Webhook Receiver
// Verifies HMAC SHA-256 signature, enforces payload size limit, deduplicates deliveries,
// and transiently extracts only approved metadata without storing raw payloads.
import { NextRequest, NextResponse } from 'next/server';
import { env, isGitHubAppConfigured } from '@/lib/env';
import {
  ALLOWED_WEBHOOK_EVENTS,
  MAX_WEBHOOK_BODY_BYTES,
  extractApprovedWebhookMetadata,
  verifyGitHubSignature,
} from '@/server/webhooks/github';
import { checkRateLimit, getRateLimitHeaders } from '@/server/security/rate-limiter';
import { getClientIp } from '@/server/security/csrf';
import { db } from '@/server/db';
import { webhookDeliveryReceipts } from '@/server/db/schema';
import { enqueueJob } from '@/server/jobs/queue';
import { createChildLogger } from '@/server/security/logger';

const log = createChildLogger('webhook-receiver');

export async function POST(request: NextRequest) {
  if (!isGitHubAppConfigured() || !env.GITHUB_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'GitHub App not configured' }, { status: 503 });
  }

  const clientIp = getClientIp(request);
  const rl = await checkRateLimit(clientIp, 'webhook:github');
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_WEBHOOK_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const deliveryId = request.headers.get('x-github-delivery');
  const eventType = request.headers.get('x-github-event');
  const signature = request.headers.get('x-hub-signature-256');

  if (!deliveryId || !eventType || !signature) {
    return NextResponse.json({ error: 'Missing required GitHub headers' }, { status: 400 });
  }

  if (!ALLOWED_WEBHOOK_EVENTS.has(eventType)) {
    return NextResponse.json({ ignored: true, reason: 'Event type not subscribed' }, { status: 202 });
  }

  // Read raw body with size limit enforcement
  const rawBuffer = await request.arrayBuffer();
  if (rawBuffer.byteLength > MAX_WEBHOOK_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const rawBody = Buffer.from(rawBuffer);

  if (!verifyGitHubSignature(rawBody, signature, env.GITHUB_WEBHOOK_SECRET)) {
    log.warn({ deliveryId, eventType }, 'Invalid GitHub webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'Malformed JSON body' }, { status: 400 });
  }

  const normalized = extractApprovedWebhookMetadata(deliveryId, eventType, parsedBody);
  if (!normalized) {
    return NextResponse.json({ error: 'Invalid payload schema' }, { status: 400 });
  }

  // Atomic delivery receipt creation (idempotency via unique constraint on delivery_id)
  try {
    const inserted = await db
      .insert(webhookDeliveryReceipts)
      .values({
        deliveryId: normalized.deliveryId,
        eventType: normalized.eventType,
        action: normalized.action,
        installationId: normalized.installationId,
        repoId: normalized.githubRepoId,
        processed: false,
      })
      .onConflictDoNothing()
      .returning({ id: webhookDeliveryReceipts.id });

    if (inserted.length === 0) {
      // Duplicate delivery — acknowledge idempotently
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }

    await enqueueJob({
      queue: 'webhooks',
      type: 'process_webhook_event',
      priority: 10,
      payload: {
        receiptId: inserted[0]!.id,
        ...normalized,
        eventTimestamp: normalized.eventTimestamp.toISOString(),
      },
    });

    return NextResponse.json({ ok: true, accepted: true }, { status: 202 });
  } catch (error) {
    log.error({ error, deliveryId }, 'Failed to persist webhook delivery');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
