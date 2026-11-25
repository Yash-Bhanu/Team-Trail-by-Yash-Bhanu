// Repository Linking API — verifies mentor authority, GitHub installation, and prevents reassignment
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/server/auth/session';
import { enforce, AuthorizationError } from '@/server/authorization';
import { linkRepoSchema } from '@/lib/validations';
import { db } from '@/server/db';
import { installations, repos } from '@/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { enqueueJob } from '@/server/jobs/queue';
import { validateOrigin, recordAuditEvent, getClientIp } from '@/server/security/csrf';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const { id: teamId } = await context.params;
    const user = await requireAuthUser();
    await enforce(user, 'team:link_repo', { teamId });

    const body = await request.json();
    const parsed = linkRepoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    // Verify installation exists and is not suspended
    const inst = await db.query.installations.findFirst({
      where: eq(installations.githubInstallationId, parsed.data.installationId),
    });

    if (!inst || inst.isSuspended) {
      return NextResponse.json({ error: 'GitHub App installation not found or suspended' }, { status: 400 });
    }

    // Prevent unauthorized reassignment of a repository already linked to another active team
    const existingActive = await db.query.repos.findFirst({
      where: and(
        eq(repos.githubRepoId, parsed.data.githubRepoId),
        isNull(repos.unlinkedAt)
      ),
    });

    if (existingActive && existingActive.teamId !== teamId) {
      return NextResponse.json(
        { error: 'Repository is already linked to another team' },
        { status: 409 }
      );
    }

    const [linked] = await db
      .insert(repos)
      .values({
        teamId,
        installationId: inst.id,
        githubRepoId: parsed.data.githubRepoId,
        githubFullName: parsed.data.githubFullName,
        defaultBranch: parsed.data.defaultBranch,
        integrationStatus: 'connected',
        linkedById: user.id,
      })
      .returning();

    await enqueueJob({
      queue: 'sync',
      type: 'sync_repo_history',
      priority: 5,
      payload: { repoId: linked!.id },
    });

    await recordAuditEvent({
      userId: user.id,
      action: 'team:link_repo',
      resourceType: 'repo',
      resourceId: linked!.id,
      metadata: { githubFullName: parsed.data.githubFullName },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ repo: linked }, { status: 201 });
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
