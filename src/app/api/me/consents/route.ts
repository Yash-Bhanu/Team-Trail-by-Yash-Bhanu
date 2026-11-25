// Consent Management API — GET and POST (versioned consent records)
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/server/auth/session';
import { updateConsentSchema } from '@/lib/validations';
import { db } from '@/server/db';
import { consents } from '@/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { validateOrigin, recordAuditEvent, getClientIp } from '@/server/security/csrf';

export async function GET() {
  try {
    const user = await requireAuthUser();
    const records = await db.query.consents.findMany({
      where: eq(consents.userId, user.id),
      orderBy: [desc(consents.grantedAt)],
    });

    return NextResponse.json({ consents: records }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const user = await requireAuthUser();
    const body = await request.json();
    const parsed = updateConsentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const [record] = await db
      .insert(consents)
      .values({
        userId: user.id,
        consentType: parsed.data.consentType,
        granted: parsed.data.granted,
        version: 1,
        revokedAt: parsed.data.granted ? null : new Date(),
      })
      .returning();

    await recordAuditEvent({
      userId: user.id,
      action: parsed.data.granted ? 'consent:grant' : 'consent:withdraw',
      resourceType: 'consent',
      resourceId: record!.id,
      metadata: { consentType: parsed.data.consentType },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ consent: record }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
