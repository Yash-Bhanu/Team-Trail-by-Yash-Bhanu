// Team Activity Events API (metadata only)
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/server/auth/session';
import { enforce, AuthorizationError } from '@/server/authorization';
import { db } from '@/server/db';
import { activityEvents } from '@/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await context.params;
    const user = await requireAuthUser();
    await enforce(user, 'activity:read', { teamId });

    const events = await db.query.activityEvents.findMany({
      where: eq(activityEvents.teamId, teamId),
      orderBy: [desc(activityEvents.eventTimestamp)],
      limit: 100,
    });

    return NextResponse.json({ events }, { headers: { 'Cache-Control': 'private, no-store' } });
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
