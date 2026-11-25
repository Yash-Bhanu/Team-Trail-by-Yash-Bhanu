// Course detail & update API
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/server/auth/session';
import { enforce, AuthorizationError } from '@/server/authorization';
import { updateCourseSchema } from '@/lib/validations';
import { db } from '@/server/db';
import { courses, teams } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { validateOrigin, recordAuditEvent, getClientIp } from '@/server/security/csrf';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await context.params;
    const user = await requireAuthUser();
    await enforce(user, 'course:read', { courseId });

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
      with: { teams: true },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({ course }, { headers: { 'Cache-Control': 'private, no-store' } });
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const { id: courseId } = await context.params;
    const user = await requireAuthUser();
    await enforce(user, 'course:update', { courseId });

    const body = await request.json();
    const parsed = updateCourseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const [updated] = await db
      .update(courses)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(courses.id, courseId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    await recordAuditEvent({
      userId: user.id,
      action: 'course:update',
      resourceType: 'course',
      resourceId: courseId,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ course: updated });
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
