// Course Flags API
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/server/auth/session';
import { enforce, AuthorizationError } from '@/server/authorization';
import { db } from '@/server/db';
import { flags } from '@/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await context.params;
    const user = await requireAuthUser();
    await enforce(user, 'flag:read', { courseId });

    const courseFlags = await db.query.flags.findMany({
      where: eq(flags.courseId, courseId),
      with: { team: true, resolutionHistory: true },
      orderBy: [desc(flags.detectedAt)],
      limit: 200,
    });

    return NextResponse.json({ flags: courseFlags }, { headers: { 'Cache-Control': 'private, no-store' } });
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
