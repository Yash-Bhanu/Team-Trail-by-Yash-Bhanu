// Repository Unlinking API — mentor-only, soft-unlink preserving audit trail
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/server/auth/session';
import { enforce, AuthorizationError } from '@/server/authorization';
import { db } from '@/server/db';
import { repos } from '@/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { validateOrigin, recordAuditEvent, getClientIp } from '@/server/security/csrf';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; repoId: string }> }
) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const { id: teamId, repoId } = await context.params;
    const user = await requireAuthUser();
    await enforce(user, 'team:unlink_repo', { teamId });

    const [unlinked] = await db
      .update(repos)
      .set({ unlinkedAt: new Date(), integrationStatus: 'disconnected' })
      .where(and(eq(repos.id, repoId), eq(repos.teamId, teamId)))
      .returning();

    if (!unlinked) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    await recordAuditEvent({
      userId: user.id,
      action: 'team:unlink_repo',
      resourceType: 'repo',
      resourceId: repoId,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ ok: true });
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
