// Courses API: GET (list authorized courses) and POST (create course)
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/server/auth/session';
import { enforce, AuthorizationError } from '@/server/authorization';
import { createCourseSchema } from '@/lib/validations';
import { db } from '@/server/db';
import { courses, courseMembers } from '@/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { validateOrigin, recordAuditEvent, getClientIp } from '@/server/security/csrf';
import { checkRateLimit, getRateLimitHeaders } from '@/server/security/rate-limiter';

export async function GET() {
  try {
    const user = await requireAuthUser();

    const memberships = await db.query.courseMembers.findMany({
      where: eq(courseMembers.userId, user.id),
    });

    if (user.role === 'admin') {
      const allCourses = await db.query.courses.findMany({
        orderBy: (c, { desc }) => [desc(c.createdAt)],
      });
      return NextResponse.json({ courses: allCourses }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const courseIds = memberships.map((m) => m.courseId);
    if (courseIds.length === 0) {
      return NextResponse.json({ courses: [] }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const userCourses = await db.query.courses.findMany({
      where: inArray(courses.id, courseIds),
      orderBy: (c, { desc }) => [desc(c.createdAt)],
    });

    return NextResponse.json({ courses: userCourses }, { headers: { 'Cache-Control': 'private, no-store' } });
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
    await enforce(user, 'course:create');

    const rl = await checkRateLimit(user.id, 'api:general');
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getRateLimitHeaders(rl) });
    }

    const body = await request.json();
    const parsed = createCourseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const created = await db.transaction(async (tx) => {
      const [course] = await tx
        .insert(courses)
        .values({
          ...parsed.data,
          createdById: user.id,
        })
        .returning();

      await tx.insert(courseMembers).values({
        courseId: course!.id,
        userId: user.id,
        role: 'mentor',
      });

      return course!;
    });

    await recordAuditEvent({
      userId: user.id,
      action: 'course:create',
      resourceType: 'course',
      resourceId: created.id,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ course: created }, { status: 201 });
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
