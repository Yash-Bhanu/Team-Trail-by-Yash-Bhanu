// Transactional, race-safe Invitation Redemption
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/server/auth/session';
import { redeemInvitationSchema } from '@/lib/validations';
import { db } from '@/server/db';
import { invitations, courseMembers, teamMembers } from '@/server/db/schema';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { hashToken } from '@/lib/utils';
import { validateOrigin, recordAuditEvent, getClientIp } from '@/server/security/csrf';
import { checkRateLimit, getRateLimitHeaders } from '@/server/security/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const user = await requireAuthUser();
    const rl = await checkRateLimit(user.id, 'invitation:redeem');
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getRateLimitHeaders(rl) });
    }

    const body = await request.json();
    const parsed = redeemInvitationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
    }

    const tokenHash = await hashToken(parsed.data.token);
    const now = new Date();

    const redeemed = await db.transaction(async (tx) => {
      // Atomic increment with guard against expiration and maxUses race
      const updated = await tx
        .update(invitations)
        .set({
          usedCount: sql`${invitations.usedCount} + 1`,
        })
        .where(
          and(
            eq(invitations.tokenHash, tokenHash),
            eq(invitations.status, 'active'),
            gt(invitations.expiresAt, now),
            lt(invitations.usedCount, invitations.maxUses)
          )
        )
        .returning();

      if (updated.length === 0) {
        return null;
      }

      const inv = updated[0]!;
      if (inv.usedCount >= inv.maxUses) {
        await tx
          .update(invitations)
          .set({ status: 'redeemed' })
          .where(eq(invitations.id, inv.id));
      }

      await tx
        .insert(courseMembers)
        .values({
          courseId: inv.courseId,
          userId: user.id,
          role: inv.role,
        })
        .onConflictDoNothing();

      if (inv.teamId) {
        await tx
          .insert(teamMembers)
          .values({
            teamId: inv.teamId,
            userId: user.id,
            role: inv.role,
          })
          .onConflictDoNothing();
      }

      return inv;
    });

    if (!redeemed) {
      return NextResponse.json({ error: 'Invitation is invalid, expired, or already used' }, { status: 400 });
    }

    await recordAuditEvent({
      userId: user.id,
      action: 'invitation:redeem',
      resourceType: 'invitation',
      resourceId: redeemed.id,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ ok: true, courseId: redeemed.courseId, teamId: redeemed.teamId });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
