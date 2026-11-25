// Server-side session helpers — server-only
import 'server-only';

import { headers } from 'next/headers';
import { auth } from '@/server/auth';
import { getUserProfile, type AuthUser } from '@/server/authorization';

export async function getSession() {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });
    return session;
  } catch {
    // Fail closed when session lookup cannot reach database
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  return session;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session?.user) return null;
  return getUserProfile(session.user.id);
}

export async function requireAuthUser(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
