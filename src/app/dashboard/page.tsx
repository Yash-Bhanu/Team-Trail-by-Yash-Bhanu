// Authenticated Dashboard Router — redirects based on server-verified role
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/server/auth/session';

export default async function DashboardIndexPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect('/sign-in');
  }

  if (user.role === 'admin') {
    redirect('/dashboard/admin');
  }
  if (user.role === 'mentor') {
    redirect('/dashboard/mentor');
  }
  redirect('/dashboard/student');
}
