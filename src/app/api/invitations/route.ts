// Scoped Invitation Creation — mentors only, stores SHA-256 token hash
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/server/auth/session';
import { enforce, AuthorizationError } from '@/server/authorization';
import { createInvitationSchema } from '@/lib/validations';
import { db } from '@/server/db';
import { invitations } from '@/server/db/schema';
import { generateSecureToken, hashToken } from '@/lib/utils';
import { validateOrigin, recordAuditEvent, getClientIp } from '@/server/security/csrf';

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const user = await requireAuthUser();
    const body = await request.json();
    const parsed = createInvitationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    await enforce(user, 'invitation:create', { courseId: parsed.data.courseId });

    const rawToken = await generateSecureToken(32);
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000);

    const [created] = await db
      .insert(invitations)
      .values({
        tokenHash,
        courseId: parsed.data.courseId,
        teamId: parsed.data.teamId ?? null,
        role: parsed.data.role,
        email: parsed.data.email ?? null,
        maxUses: parsed.data.maxUses,
        expiresAt,
        createdById: user.id,
      })
      .returning({
        id: invitations.id,
        courseId: invitations.courseId,
        teamId: invitations.teamId,
        role: invitations.role,
        expiresAt: invitations.expiresAt,
        maxUses: invitations.maxUses,
      });

    await recordAuditEvent({
      userId: user.id,
      action: 'invitation:create',
      resourceType: 'invitation',
      resourceId: created!.id,
      ipAddress: getClientIp(request),
    });

    // Return plaintext token ONCE upon creation; DB stores only the hash
    return NextResponse.json({ invitation: created, token: rawToken }, { status: 201 });
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
