// Flag resolution endpoint — mentors only, mandatory note, preserves resolution history
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/server/auth/session';
import { enforce, AuthorizationError } from '@/server/authorization';
import { resolveFlagSchema } from '@/lib/validations';
import { db } from '@/server/db';
import { flags, flagResolutionHistory } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { validateOrigin, recordAuditEvent, getClientIp } from '@/server/security/csrf';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const { id: flagId } = await context.params;
    const user = await requireAuthUser();

    const flag = await db.query.flags.findFirst({ where: eq(flags.id, flagId) });
    if (!flag) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
    }

    await enforce(user, 'flag:resolve', { courseId: flag.courseId });

    const body = await request.json();
    const parsed = resolveFlagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await db.transaction(async (tx) => {
      const [updatedFlag] = await tx
        .update(flags)
        .set({
          status: parsed.data.action,
          resolvedAt: new Date(),
          resolvedById: user.id,
        })
        .where(eq(flags.id, flagId))
        .returning();

      await tx.insert(flagResolutionHistory).values({
        flagId,
        action: parsed.data.action,
        note: parsed.data.note,
        performedById: user.id,
      });

      return updatedFlag!;
    });

    await recordAuditEvent({
      userId: user.id,
      action: 'flag:resolve',
      resourceType: 'flag',
      resourceId: flagId,
      metadata: { action: parsed.data.action },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ flag: updated });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
