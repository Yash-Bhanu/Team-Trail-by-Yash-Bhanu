// Admin User & Operational Health API — strictly admin-only, never exposes secrets or private check-ins
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/server/auth/session';
import { enforce, AuthorizationError } from '@/server/authorization';
import { db } from '@/server/db';
import { profiles, backgroundJobs, auditLog } from '@/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { validateOrigin, recordAuditEvent, getClientIp } from '@/server/security/csrf';

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['student', 'mentor', 'admin']).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await requireAuthUser();
    await enforce(user, 'admin:dashboard');

    const [allProfiles, failedJobs, recentAudit] = await Promise.all([
      db.query.profiles.findMany({
        orderBy: [desc(profiles.createdAt)],
        limit: 200,
      }),
      db.query.backgroundJobs.findMany({
        where: eq(backgroundJobs.status, 'dead'),
        orderBy: [desc(backgroundJobs.createdAt)],
        limit: 50,
      }),
      db.query.auditLog.findMany({
        orderBy: [desc(auditLog.timestamp)],
        limit: 100,
      }),
    ]);

    return NextResponse.json(
      { profiles: allProfiles, failedJobs, recentAudit },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
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

export async function PATCH(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const user = await requireAuthUser();
    await enforce(user, 'user:manage');

    const body = await request.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const [updated] = await db
      .update(profiles)
      .set({
        ...(parsed.data.role ? { role: parsed.data.role } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, parsed.data.userId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    await recordAuditEvent({
      userId: user.id,
      action: 'admin:update_user',
      resourceType: 'profile',
      resourceId: updated.id,
      metadata: { role: parsed.data.role, isActive: parsed.data.isActive },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ profile: updated });
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
