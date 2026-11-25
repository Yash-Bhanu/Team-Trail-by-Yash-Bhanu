// Check-ins API for a team: GET (authorized) and POST (student weekly check-in)
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/server/auth/session';
import { enforce, can, AuthorizationError } from '@/server/authorization';
import { checkinSchema } from '@/lib/validations';
import { db } from '@/server/db';
import { checkins, teams, courses } from '@/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { getWeekStart } from '@/lib/utils';
import { validateOrigin, recordAuditEvent, getClientIp } from '@/server/security/csrf';
import { checkRateLimit, getRateLimitHeaders } from '@/server/security/rate-limiter';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await context.params;
    const user = await requireAuthUser();

    // Mentors can read all team check-ins; students can read only their own
    const mentorCheck = await can(user, 'checkin:read_team', { teamId });

    if (mentorCheck.allowed) {
      const rows = await db.query.checkins.findMany({
        where: eq(checkins.teamId, teamId),
        orderBy: [desc(checkins.submittedAt)],
        limit: 100,
      });
      return NextResponse.json({ checkins: rows }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    await enforce(user, 'team:read', { teamId });
    const ownRows = await db.query.checkins.findMany({
      where: and(eq(checkins.teamId, teamId), eq(checkins.userId, user.id)),
      orderBy: [desc(checkins.submittedAt)],
      limit: 52,
    });

    return NextResponse.json({ checkins: ownRows }, { headers: { 'Cache-Control': 'private, no-store' } });
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
    await enforce(user, 'checkin:submit', { teamId });

    const rl = await checkRateLimit(user.id, 'checkin:submit');
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getRateLimitHeaders(rl) });
    }

    const body = await request.json();
    const parsed = checkinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const course = await db.query.courses.findFirst({ where: eq(courses.id, team.courseId) });
    const weekStart = getWeekStart(new Date(), course?.timezone ?? 'UTC');

    const inserted = await db
      .insert(checkins)
      .values({
        teamId,
        userId: user.id,
        weekStart,
        completedWork: parsed.data.completedWork,
        isBlocked: parsed.data.isBlocked,
        blockerDescription: parsed.data.isBlocked ? (parsed.data.blockerDescription ?? null) : null,
        confidenceLevel: parsed.data.confidenceLevel,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted.length === 0) {
      return NextResponse.json(
        { error: 'You have already submitted a check-in for this week.' },
        { status: 409 }
      );
    }

    await recordAuditEvent({
      userId: user.id,
      action: 'checkin:submit',
      resourceType: 'checkin',
      resourceId: inserted[0]!.id,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ checkin: inserted[0] }, { status: 201 });
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
