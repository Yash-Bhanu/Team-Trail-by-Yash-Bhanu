// Authorized Data Deletion Request API
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/server/auth/session';
import { db } from '@/server/db';
import { dataDeletionRequests, checkins, consents } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { validateOrigin, recordAuditEvent, getClientIp } from '@/server/security/csrf';

export async function DELETE(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const user = await requireAuthUser();

    const deletionRequest = await db.transaction(async (tx) => {
      // Delete user's private check-ins and withdraw consents
      await tx.delete(checkins).where(eq(checkins.userId, user.id));

      await tx.insert(consents).values({
        userId: user.id,
        consentType: 'activity_collection',
        granted: false,
        revokedAt: new Date(),
      });

      const [req] = await tx
        .insert(dataDeletionRequests)
        .values({
          userId: user.id,
          status: 'completed',
          reason: 'User-initiated data deletion',
          processedAt: new Date(),
          completedAt: new Date(),
        })
        .returning();

      return req!;
    });

    await recordAuditEvent({
      userId: user.id,
      action: 'user:delete_data',
      resourceType: 'data_deletion_request',
      resourceId: deletionRequest.id,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ ok: true, request: deletionRequest });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
