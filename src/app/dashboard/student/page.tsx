// Student Dashboard — server-verified student access with weekly check-in & privacy controls
import { redirect } from 'next/navigation';
import { getAuthUser, getSession } from '@/server/auth/session';
import { db } from '@/server/db';
import { teamMembers, checkins, flags } from '@/server/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WeeklyCheckinForm } from '@/components/forms/weekly-checkin-form';
import { ShieldCheck, Users, AlertTriangle } from 'lucide-react';

export default async function StudentDashboardPage() {
  const session = await getSession();
  const user = await getAuthUser();

  if (!session?.user || !user) {
    redirect('/sign-in');
  }

  const memberships = await db.query.teamMembers.findMany({
    where: eq(teamMembers.userId, user.id),
    with: { team: true },
  });

  const activeTeam = memberships[0]?.team ?? null;
  const teamIds = memberships.map((m) => m.teamId);

  const myCheckins = await db.query.checkins.findMany({
    where: eq(checkins.userId, user.id),
    orderBy: [desc(checkins.submittedAt)],
    limit: 12,
  });

  const sharedFlags =
    teamIds.length > 0
      ? await db.query.flags.findMany({
          where: inArray(flags.teamId, teamIds),
          orderBy: [desc(flags.detectedAt)],
          limit: 20,
        })
      : [];

  return (
    <DashboardShell role={user.role} userName={session.user.name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Dashboard</h1>
          <p className="text-sm text-slate-500">
            Submit your 60-second weekly check-in, view shared team flags, and manage your privacy settings.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                {activeTeam ? activeTeam.name : 'No Team Assigned'}
              </CardTitle>
              <CardDescription>
                {activeTeam
                  ? activeTeam.projectName || 'Your assigned project team'
                  : 'Redeem an invitation link from your mentor to join a course and team.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeTeam ? (
                <WeeklyCheckinForm teamId={activeTeam.id} />
              ) : (
                <p className="text-sm text-slate-500">
                  Once you join a team, your 60-second weekly check-in form will appear here.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Shared Team Flags
                </CardTitle>
                <CardDescription>
                  Flags are transparent to both you and your mentor.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sharedFlags.length === 0 ? (
                  <p className="text-sm text-slate-500">No active flags for your team.</p>
                ) : (
                  <div className="space-y-2">
                    {sharedFlags.map((flag) => (
                      <div key={flag.id} className="rounded-md border border-slate-200 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">{flag.title}</span>
                          <Badge variant={flag.status === 'open' ? 'warning' : 'success'}>{flag.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{flag.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                  My Check-in History &amp; Privacy
                </CardTitle>
                <CardDescription>
                  Only you and your authorized course mentor can view your individual check-in answers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myCheckins.length === 0 ? (
                  <p className="text-sm text-slate-500">No check-ins submitted yet.</p>
                ) : (
                  <div className="space-y-2">
                    {myCheckins.slice(0, 5).map((c) => (
                      <div key={c.id} className="rounded-md border border-slate-100 bg-slate-50 p-2.5 text-xs">
                        <div className="flex justify-between font-medium text-slate-700">
                          <span>Confidence: {c.confidenceLevel}/5</span>
                          <span>{c.isBlocked ? 'Blocked' : 'On track'}</span>
                        </div>
                        <p className="mt-1 text-slate-600">{c.completedWork}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
