// Current authenticated user endpoint
import { NextResponse } from 'next/server';
import { getAuthUser, getSession } from '@/server/auth/session';
import { db } from '@/server/db';
import { profiles } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authUser = await getAuthUser();
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, session.user.id),
    });

    return NextResponse.json(
      {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: authUser?.role ?? 'student',
        githubUsername: profile?.githubUsername ?? null,
        onboardedAt: profile?.onboardedAt ?? null,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
