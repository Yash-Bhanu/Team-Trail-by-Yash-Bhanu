'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { DEMO_TEAMS, DEMO_STATS } from '@/lib/demo-data';
import type { DemoFlag, DemoTeam } from '@/types';
import { TeamTrailLogo } from '@/components/layout/logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form-controls';
import { Drawer } from '@/components/ui/overlay';
import { ActivityTrendChart, ContributionDistributionChart } from '@/components/charts/activity-charts';
import { formatRelativeTime } from '@/lib/utils';
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  GitBranch,
  Users,
  ClipboardCheck,
  Info,
  ArrowLeft,
} from 'lucide-react';

export default function DemoPage() {
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<DemoTeam>(DEMO_TEAMS[0]!);
  const [selectedFlag, setSelectedFlag] = useState<{ flag: DemoFlag; teamName: string } | null>(null);

  const filteredTeams = useMemo(() => {
    return DEMO_TEAMS.filter((t) => {
      if (courseFilter !== 'all' && t.courseName !== courseFilter) return false;
      if (onlyFlagged && t.flags.length === 0) return false;
      if (
        search &&
        !t.name.toLowerCase().includes(search.toLowerCase()) &&
        !t.projectName.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [search, courseFilter, onlyFlagged]);

  const severityVariant = (sev: string) => {
    if (sev === 'critical' || sev === 'high') return 'destructive' as const;
    if (sev === 'medium') return 'warning' as const;
    return 'secondary' as const;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Persistent Demo Mode Banner */}
      <div className="border-b border-teal-200 bg-teal-50 px-4 py-2 text-center text-xs font-medium text-teal-900">
        <span className="inline-flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-teal-700" />
          <strong>Demo Mode (Read-Only):</strong> Viewing 13 fictional teams with synthetic data. Completely isolated from live databases and authentication.
        </span>
      </div>

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <TeamTrailLogo size="sm" />
            </Link>
            <Badge variant="teal">Guest Demo</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-3.5 w-3.5" /> Back Home
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* KPI Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Fictional Teams</span>
                <Users className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="mt-1 text-2xl font-bold">{DEMO_STATS.totalTeams}</p>
              <p className="mt-1 text-xs text-slate-500">{DEMO_STATS.totalStudents} synthetic students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Teams Needing Attention</span>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <p className="mt-1 text-2xl font-bold text-amber-700">{DEMO_STATS.teamsNeedingAttention}</p>
              <p className="mt-1 text-xs text-slate-500">{DEMO_STATS.openFlags} open risk flags</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Check-in Completion</span>
                <ClipboardCheck className="h-4 w-4 text-teal-600" />
              </div>
              <p className="mt-1 text-2xl font-bold">{DEMO_STATS.checkinCompletionRate}%</p>
              <p className="mt-1 text-xs text-slate-500">This week&apos;s synthetic pulse</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Integration Health</span>
                <GitBranch className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-1 text-2xl font-bold text-emerald-700">12 / 13</p>
              <p className="mt-1 text-xs text-slate-500">1 disconnected (Team Vertex)</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Team Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Team Risk Overview</CardTitle>
                <CardDescription>Click any team to inspect charts and check-ins, or click a flag for evidence.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    aria-label="Search demo teams"
                    placeholder="Search teams..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-48 pl-8"
                  />
                </div>
                <select
                  aria-label="Filter by course"
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-700"
                >
                  <option value="all">All Courses</option>
                  {DEMO_STATS.courses.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant={onlyFlagged ? 'default' : 'outline'}
                  onClick={() => setOnlyFlagged((f) => !f)}
                >
                  Flagged Only
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <tr>
                    <th className="pb-2.5 pr-4">Team</th>
                    <th className="pb-2.5 pr-4">Members</th>
                    <th className="pb-2.5 pr-4">Repository</th>
                    <th className="pb-2.5 pr-4">Last Activity</th>
                    <th className="pb-2.5 pr-4">Status</th>
                    <th className="pb-2.5">Open Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeams.map((team) => (
                    <tr
                      key={team.id}
                      onClick={() => setSelectedTeam(team)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                        selectedTeam.id === team.id ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <td className="py-3 pr-4">
                        <div className="font-medium text-slate-900">{team.name}</div>
                        <div className="text-xs text-slate-500">{team.projectName}</div>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{team.members.length}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-slate-600">{team.repoName}</td>
                      <td className="py-3 pr-4 text-xs text-slate-500">{formatRelativeTime(team.lastActivityAt)}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={team.integrationStatus === 'healthy' ? 'success' : 'warning'}>
                          {team.integrationStatus}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {team.flags.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Clear
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {team.flags.map((flag) => (
                              <button
                                key={flag.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFlag({ flag, teamName: team.name });
                                }}
                              >
                                <Badge variant={severityVariant(flag.severity)} className="cursor-pointer hover:opacity-80">
                                  {flag.ruleId}: {flag.category.replace(/_/g, ' ')}
                                </Badge>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Selected Team Detail Charts & Check-ins */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{selectedTeam.name} — Activity Trend</CardTitle>
              <CardDescription>{selectedTeam.projectName}</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityTrendChart data={selectedTeam.metrics} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selectedTeam.name} — Observed GitHub Activity</CardTitle>
              <CardDescription>Eligible team member events (bots excluded)</CardDescription>
            </CardHeader>
            <CardContent>
              <ContributionDistributionChart data={selectedTeam.contributionBreakdown} />
            </CardContent>
          </Card>
        </div>

        {/* Selected Team Check-ins */}
        <Card>
          <CardHeader>
            <CardTitle>{selectedTeam.name} — Latest Weekly Check-ins</CardTitle>
            <CardDescription>Self-reported student progress and blockers</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedTeam.checkins.length === 0 ? (
              <p className="text-sm text-slate-500">No check-ins submitted this week for {selectedTeam.name}.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {selectedTeam.checkins.map((c) => (
                  <div key={c.memberName} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">{c.memberName}</span>
                      <div className="flex items-center gap-2">
                        {c.isBlocked && <Badge variant="destructive">Blocked</Badge>}
                        <Badge variant="outline">Confidence: {c.confidenceLevel}/5</Badge>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{c.completedWork}</p>
                    {c.isBlocked && c.blockerDescription && (
                      <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-800">
                        <strong>Blocker:</strong> {c.blockerDescription}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Evidence Drawer */}
      <Drawer
        open={!!selectedFlag}
        onClose={() => setSelectedFlag(null)}
        title={selectedFlag?.flag.title ?? ''}
        subtitle={selectedFlag ? `${selectedFlag.teamName} · Rule ${selectedFlag.flag.ruleId}` : ''}
      >
        {selectedFlag && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={severityVariant(selectedFlag.flag.severity)}>
                Severity: {selectedFlag.flag.severity}
              </Badge>
              <Badge variant="outline">Status: {selectedFlag.flag.status}</Badge>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900">Explanation</h4>
              <p className="mt-1 leading-relaxed text-slate-600">{selectedFlag.flag.explanation}</p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900">Data Coverage Context</h4>
              <p className="mt-1 rounded-md bg-slate-50 p-3 text-xs text-slate-700">
                {selectedFlag.flag.dataCoverage}
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900">Supporting Evidence</h4>
              <pre className="mt-1 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
                {JSON.stringify(selectedFlag.flag.evidence, null, 2)}
              </pre>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              In live mode, mentors can resolve flags here with a mandatory explanatory note preserved in the audit history.
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
