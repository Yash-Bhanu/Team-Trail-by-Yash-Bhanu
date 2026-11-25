// Course CSV Export — formula-injection protected, mentor-only
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/server/auth/session';
import { enforce, AuthorizationError } from '@/server/authorization';
import { db } from '@/server/db';
import { teams, flags } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { sanitizeCsvCell } from '@/lib/utils';
import { checkRateLimit, getRateLimitHeaders } from '@/server/security/rate-limiter';
import { recordAuditEvent, getClientIp } from '@/server/security/csrf';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await context.params;
    const user = await requireAuthUser();
    await enforce(user, 'course:export', { courseId });

    const rl = await checkRateLimit(user.id, 'export:csv');
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getRateLimitHeaders(rl) });
    }

    const courseTeams = await db.query.teams.findMany({
      where: eq(teams.courseId, courseId),
      with: { members: true, repos: true },
    });

    const courseFlags = await db.query.flags.findMany({
      where: eq(flags.courseId, courseId),
    });

    const headers = ['Team ID', 'Team Name', 'Project Name', 'Members', 'Linked Repo', 'Open Flags', 'Resolved Flags'];
    const rows = courseTeams.map((team) => {
      const teamFlags = courseFlags.filter((f) => f.teamId === team.id);
      const openCount = teamFlags.filter((f) => f.status === 'open').length;
      const resolvedCount = teamFlags.filter((f) => f.status === 'resolved').length;
      const activeRepo = team.repos.find((r) => !r.unlinkedAt);

      return [
        sanitizeCsvCell(team.id),
        sanitizeCsvCell(team.name),
        sanitizeCsvCell(team.projectName ?? ''),
        String(team.members.filter((m) => !m.removedAt).length),
        sanitizeCsvCell(activeRepo?.githubFullName ?? 'None'),
        String(openCount),
        String(resolvedCount),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    await recordAuditEvent({
      userId: user.id,
      action: 'course:export',
      resourceType: 'course',
      resourceId: courseId,
      ipAddress: getClientIp(request),
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="teamtrail-course-${courseId.slice(0, 8)}.csv"`,
        'Cache-Control': 'private, no-store',
      },
    });
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
