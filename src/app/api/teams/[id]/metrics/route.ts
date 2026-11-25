// Team Daily Metrics API
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/server/auth/session';
import { enforce, AuthorizationError } from '@/server/authorization';
import { db } from '@/server/db';
import { dailyMetrics } from '@/server/db/schema';
import { asc, eq } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await context.params;
    const user = await requireAuthUser();
    await enforce(user, 'metrics:read', { teamId });

    const metrics = await db.query.dailyMetrics.findMany({
      where: eq(dailyMetrics.teamId, teamId),
      orderBy: [asc(dailyMetrics.date)],
      limit: 90,
    });

    return NextResponse.json({ metrics }, { headers: { 'Cache-Control': 'private, no-store' } });
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
