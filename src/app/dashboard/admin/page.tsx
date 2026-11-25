// Administrator Dashboard — strictly admin-only, never exposes secrets or private student check-ins
import { redirect } from 'next/navigation';
import { getAuthUser, getSession } from '@/server/auth/session';
import { db } from '@/server/db';
import { profiles, backgroundJobs, auditLog } from '@/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { isGitHubAppConfigured, isGitHubOAuthConfigured } from '@/lib/env';

export default async function AdminDashboardPage() {
  const session = await getSession();
  const user = await getAuthUser();

  if (!session?.user || !user) {
    redirect('/sign-in');
  }
  if (user.role !== 'admin') {
    redirect('/dashboard');
  }

  const [allProfiles, deadJobs, recentAudit] = await Promise.all([
    db.query.profiles.findMany({ orderBy: [desc(profiles.createdAt)], limit: 50 }),
    db.query.backgroundJobs.findMany({ where: eq(backgroundJobs.status, 'dead'), limit: 20 }),
    db.query.auditLog.findMany({ orderBy: [desc(auditLog.timestamp)], limit: 25 }),
  ]);

  return (
    <DashboardShell role={user.role} userName={session.user.name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Administrator Console</h1>
          <p className="text-sm text-slate-500">
            Manage roles, monitor background job health, and review scoped audit metadata.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-slate-500">Registered Profiles</p>
              <p className="mt-1 text-2xl font-bold">{allProfiles.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-slate-500">Dead Background Jobs</p>
              <p className="mt-1 text-2xl font-bold">{deadJobs.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-slate-500">GitHub Integration</p>
              <div className="mt-2 flex gap-2">
                <Badge variant={isGitHubOAuthConfigured() ? 'success' : 'warning'}>
                  OAuth: {isGitHubOAuthConfigured() ? 'Configured' : 'Missing'}
                </Badge>
                <Badge variant={isGitHubAppConfigured() ? 'success' : 'warning'}>
                  App: {isGitHubAppConfigured() ? 'Configured' : 'Missing'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Audit Metadata</CardTitle>
            <CardDescription>Last 25 security and operational events (redacted)</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAudit.length === 0 ? (
              <p className="text-sm text-slate-500">No audit events recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {recentAudit.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-2">
                    <div>
                      <span className="font-mono font-medium text-slate-900">{entry.action}</span>
                      <span className="ml-2 text-slate-500">
                        {entry.resourceType} {entry.resourceId ? `(${entry.resourceId.slice(0, 8)})` : ''}
                      </span>
                    </div>
                    <span className="text-slate-400">{entry.timestamp.toISOString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
