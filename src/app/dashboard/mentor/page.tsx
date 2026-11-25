// Mentor Dashboard — server-verified mentor/admin access only
import { redirect } from 'next/navigation';
import { getAuthUser, getSession } from '@/server/auth/session';
import { db } from '@/server/db';
import { courseMembers, courses, teams, flags } from '@/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertTriangle, BookOpen, Download, Users } from 'lucide-react';

export default async function MentorDashboardPage() {
  const session = await getSession();
  const user = await getAuthUser();

  if (!session?.user || !user) {
    redirect('/sign-in');
  }
  if (user.role !== 'mentor' && user.role !== 'admin') {
    redirect('/dashboard/student');
  }

  const memberships = await db.query.courseMembers.findMany({
    where: eq(courseMembers.userId, user.id),
  });
  const courseIds = memberships.map((m) => m.courseId);

  const authorizedCourses =
    courseIds.length > 0
      ? await db.query.courses.findMany({ where: inArray(courses.id, courseIds) })
      : [];

  const courseTeams =
    courseIds.length > 0
      ? await db.query.teams.findMany({
          where: inArray(teams.courseId, courseIds),
          with: { members: true, repos: true },
        })
      : [];

  const courseFlags =
    courseIds.length > 0
      ? await db.query.flags.findMany({ where: inArray(flags.courseId, courseIds) })
      : [];

  const openFlags = courseFlags.filter((f) => f.status === 'open');

  return (
    <DashboardShell role={user.role} userName={session.user.name}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mentor Overview</h1>
            <p className="text-sm text-slate-500">
              Monitor authorized courses, review weekly check-ins, and resolve early-warning flags.
            </p>
          </div>
          {authorizedCourses[0] && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/courses/${authorizedCourses[0].id}/export.csv`}>
                <Download className="h-4 w-4" /> Export Course CSV
              </a>
            </Button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Authorized Courses</span>
                <BookOpen className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="mt-1 text-2xl font-bold">{authorizedCourses.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Active Teams</span>
                <Users className="h-4 w-4 text-teal-600" />
              </div>
              <p className="mt-1 text-2xl font-bold">{courseTeams.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Open Risk Flags</span>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <p className="mt-1 text-2xl font-bold text-amber-700">{openFlags.length}</p>
            </CardContent>
          </Card>
        </div>

        {authorizedCourses.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No courses assigned yet</CardTitle>
              <CardDescription>
                Create a course via <code className="rounded bg-slate-100 px-1 py-0.5">POST /api/courses</code> or ask an administrator to assign you to an existing course.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild>
                <Link href="/demo">View Synthetic Demo</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Assigned Teams</CardTitle>
              <CardDescription>Live teams from your authorized courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100">
                {courseTeams.map((team) => {
                  const activeRepo = team.repos.find((r) => !r.unlinkedAt);
                  const teamOpenFlags = openFlags.filter((f) => f.teamId === team.id);
                  return (
                    <div key={team.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-slate-900">{team.name}</p>
                        <p className="text-xs text-slate-500">
                          {activeRepo?.githubFullName ?? 'No repository linked'} · {team.members.length} members
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={teamOpenFlags.length > 0 ? 'warning' : 'success'}>
                          {teamOpenFlags.length} open flags
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
