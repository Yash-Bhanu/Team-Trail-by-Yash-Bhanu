import Link from 'next/link';
import { TeamTrailLogo } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  GitPullRequest,
  ShieldCheck,
  AlertTriangle,
  ClipboardCheck,
  Users,
  Eye,
  ArrowRight,
  CheckCircle2,
  Lock,
  HelpCircle,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="TeamTrail Home">
            <TeamTrailLogo showSubtext />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex" aria-label="Primary navigation">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900">How It Works</a>
            <a href="#privacy" className="hover:text-slate-900">Privacy</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/demo">View Demo</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="teal" className="mb-4">
              Privacy-First Early Warning for Student Teams
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Catch project risks before the final demo.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              TeamTrail helps university professors and hackathon mentors spot stalled repositories,
              unanswered blockers, and uneven collaboration early—using explainable GitHub metadata
              and 60-second weekly check-ins, never surveillance or automated grading.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/sign-in">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/demo">Explore Demo</Link>
              </Button>
            </div>
          </div>

          {/* Synthetic Dashboard Preview */}
          <div className="mt-14 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">CS 4400 — Software Engineering</span>
                <Badge variant="secondary">Synthetic Preview Data</Badge>
              </div>
              <span className="text-xs text-slate-500">13 teams · 45 students · Deterministic Rules v1.0</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-xs font-medium text-slate-500">Active Teams</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">13</p>
                <p className="mt-1 text-xs text-teal-700">12 repositories healthy</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                <p className="text-xs font-medium text-amber-800">Teams Needing Attention</p>
                <p className="mt-1 text-2xl font-bold text-amber-900">5</p>
                <p className="mt-1 text-xs text-amber-700">Explainable flags open</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-xs font-medium text-slate-500">Weekly Check-in Rate</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">84%</p>
                <p className="mt-1 text-xs text-slate-600">60-sec student pulse</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-xs font-medium text-slate-500">Flagged Blockers</p>
                <p className="mt-1 text-2xl font-bold text-red-700">1</p>
                <p className="mt-1 text-xs text-red-600">Team Orbit requested help</p>
              </div>
            </div>
          </div>
        </section>

        {/* Problem Statement */}
        <section className="border-y border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Why student project risks are discovered too late
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                When mentors oversee 10 to 30 student teams at once, silent blockers, unmerged branches,
                and uneven workloads stay invisible until final demo day. TeamTrail surfaces early,
                actionable signals so mentors can start supportive conversations weeks earlier.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Built for constructive mentoring
            </h2>
            <p className="mt-2 text-slate-600">
              Every metric is deterministic, explainable, and scoped to least-privilege metadata.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: GitPullRequest,
                title: 'Least-Privilege GitHub App',
                desc: 'Requests only read-only Metadata, Pull Requests, and Issues. Never accesses source code, diffs, or comment text.',
              },
              {
                icon: Users,
                title: 'Collaboration Insights',
                desc: 'Tracks PR merges, review turnaround, and observed eligible activity—explicitly excluding bot accounts.',
              },
              {
                icon: ClipboardCheck,
                title: '60-Second Weekly Check-ins',
                desc: 'Students share progress, blockers, and confidence (1–5) once per week with clear visibility rules.',
              },
              {
                icon: AlertTriangle,
                title: 'Deterministic Early-Warning Flags',
                desc: 'Transparent rules for inactivity, missing merges, slow reviews, participation imbalance, and blockers.',
              },
              {
                icon: Eye,
                title: 'Explainable Evidence Drawers',
                desc: 'Every flag includes the triggering rule, observation window, data coverage, and mandatory resolution notes.',
              },
              {
                icon: ShieldCheck,
                title: 'Privacy by Design',
                desc: 'Versioned consent records, authorized data deletion, and zero third-party analytics or surveillance.',
              },
            ].map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-slate-600">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="border-y border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-10 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              How It Works
            </h2>
            <div className="grid gap-6 md:grid-cols-5">
              {[
                { step: '1', title: 'Create Course & Teams', desc: 'Set up your course timezone, check-in schedule, and import rosters via CSV or scoped invites.' },
                { step: '2', title: 'Connect Repository', desc: 'Link each team’s authorized GitHub repository using the least-privilege GitHub App.' },
                { step: '3', title: 'Collect Metadata', desc: 'Sync 30-day PR/issue metadata and receive signed webhooks without storing code or text.' },
                { step: '4', title: 'Weekly Check-ins', desc: 'Students complete a 60-second pulse check covering completed work, blockers, and confidence.' },
                { step: '5', title: 'Intervene Early', desc: 'Review explainable risk flags with supporting evidence and resolve them with mentoring notes.' },
              ].map((item) => (
                <div key={item.step} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {item.step}
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy-First Section */}
        <section id="privacy" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-6 sm:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-teal-800">
                  <Lock className="h-4 w-4" /> Privacy-First Architecture
                </div>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  Not a surveillance tool. Never an automated grader.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  GitHub activity never represents total student effort, intelligence, or academic performance.
                  TeamTrail intentionally omits repository Contents access, does not store source code or
                  comment bodies, and never computes competitive student leaderboards.
                </p>
              </div>
              <ul className="space-y-2.5 text-sm text-slate-700">
                {[
                  'No repository Contents or code diff access',
                  'No raw webhook payloads stored or logged',
                  'No third-party tracking or external LLM APIs',
                  'Versioned consent & authorized data deletion',
                ].map((pt) => (
                  <li key={pt} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="border-y border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-8 text-2xl font-bold tracking-tight text-slate-900">
              Designed for both Mentors and Students
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>For Professors & Hackathon Mentors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-600">
                  <p>• Oversee all assigned teams in one structured dashboard.</p>
                  <p>• Spot blocked students and stalled PR pipelines days before demos.</p>
                  <p>• Export sanitized CSV reports for course coordination.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>For Student Project Teams</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-600">
                  <p>• Request mentor help clearly via 60-second weekly check-ins.</p>
                  <p>• See the exact same shared team flags and evidence as your mentor.</p>
                  <p>• Control consent preferences and exercise data deletion options.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-slate-900">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'Does TeamTrail read our source code or PR comments?',
                a: 'No. The GitHub App requests only read-only Metadata, Pull Requests, and Issues permissions. It never requests repository Contents permission and discards any text bodies transiently during webhook processing.',
              },
              {
                q: 'Are direct commits/pushes tracked?',
                a: 'No. Under the least-privilege permission model, direct pushes are not visible, and TeamTrail clearly labels data coverage so missing data is never misinterpreted as inactivity.',
              },
              {
                q: 'Does TeamTrail use AI to score students?',
                a: 'No. All risk flags use deterministic, versioned rules with transparent thresholds and supporting evidence. There are no AI APIs or composite student scores.',
              },
              {
                q: 'Can I explore the dashboard without signing in?',
                a: 'Yes! Visit the isolated Guest Demo at /demo to inspect 13 fictional teams, charts, check-ins, and evidence drawers using synthetic data.',
              },
            ].map((item) => (
              <Card key={item.q}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HelpCircle className="h-4 w-4 text-indigo-600" />
                    {item.q}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-slate-200 bg-white py-14">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-2xl font-bold text-slate-900">
              Ready to catch project risks early?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Explore the interactive synthetic demo or sign in with GitHub to get started.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
                <Link href="/demo">Explore Demo</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <TeamTrailLogo size="sm" />
            <span>· Catch project risks before the final demo.</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/demo" className="hover:text-slate-900">Guest Demo</Link>
            <a href="#privacy" className="hover:text-slate-900">Privacy Policy</a>
            <span>Built by Yash Bhanu</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
