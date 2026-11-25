// Better Auth configuration — server-only
import 'server-only';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/server/db';
import { users, sessions, accounts, verifications } from '@/server/db/schema';
import { env, isGitHubOAuthConfigured } from '@/lib/env';
import { createChildLogger } from '@/server/security/logger';

const log = createChildLogger('auth');

const socialProviders = isGitHubOAuthConfigured()
  ? {
      github: {
        clientId: env.GITHUB_CLIENT_ID!,
        clientSecret: env.GITHUB_CLIENT_SECRET!,
        scope: ['read:user', 'user:email'],
      },
    }
  : undefined;

if (!isGitHubOAuthConfigured()) {
  log.warn('GitHub OAuth not configured. Authentication will not be available.');
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  socialProviders,
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  advanced: {
    cookiePrefix: 'teamtrail',
  },
  trustedOrigins: env.ALLOWED_ORIGINS.split(',').map(o => o.trim()),
});

export type Session = typeof auth.$Infer.Session;
