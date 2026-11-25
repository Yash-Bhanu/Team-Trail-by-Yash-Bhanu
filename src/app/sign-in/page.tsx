import Link from 'next/link';
import { TeamTrailLogo } from '@/components/layout/logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isGitHubOAuthConfigured } from '@/lib/env';
import { SignInButton } from '@/components/forms/sign-in-button';
import { AlertCircle, ShieldCheck } from 'lucide-react';

export default function SignInPage() {
  const oauthConfigured = isGitHubOAuthConfigured();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="mb-8 text-center">
        <Link href="/">
          <TeamTrailLogo size="lg" showSubtext />
        </Link>
        <p className="mt-2 text-sm text-slate-500">Catch project risks before the final demo.</p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Sign in to TeamTrail</CardTitle>
          <CardDescription>
            Authenticate securely with GitHub OAuth. Only basic profile identity is requested.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {oauthConfigured ? (
            <SignInButton />
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div>
                  <p className="font-semibold">GitHub OAuth Configuration Required</p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-800">
                    Live sign-in is disabled until real GitHub OAuth credentials and a PostgreSQL database are configured locally:
                  </p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-amber-800">
                    <li>
                      Register a GitHub OAuth App with callback URL{' '}
                      <code className="rounded bg-amber-100 px-1 py-0.5">http://localhost:3000/api/auth/callback/github</code>.
                    </li>
                    <li>
                      Set <code className="rounded bg-amber-100 px-1 py-0.5">GITHUB_CLIENT_ID</code>,{' '}
                      <code className="rounded bg-amber-100 px-1 py-0.5">GITHUB_CLIENT_SECRET</code>, and{' '}
                      <code className="rounded bg-amber-100 px-1 py-0.5">DATABASE_URL</code> in{' '}
                      <code className="rounded bg-amber-100 px-1 py-0.5">.env.local</code>.
                    </li>
                    <li>
                      Run <code className="rounded bg-amber-100 px-1 py-0.5">npm run db:push</code> and restart the dev server.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
            <ShieldCheck className="h-4 w-4 shrink-0 text-teal-600" />
            <span>GitHub login requests only read:user &amp; user:email — never repository access.</span>
          </div>

          <div className="border-t border-slate-100 pt-4 text-center">
            <p className="mb-2 text-xs text-slate-500">Want to preview the interface first?</p>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/demo">Explore Read-Only Guest Demo</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
