// Environment validation — server-only
import 'server-only';

import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Better Auth
  BETTER_AUTH_SECRET: z.string().min(16, 'BETTER_AUTH_SECRET must be at least 16 characters'),
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),

  // GitHub OAuth (optional for demo mode)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // GitHub App (optional — integration features require this)
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_APP_SLUG: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  // Application
  APP_URL: z.string().url().default('http://localhost:3000'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
    if (!isBuildPhase) {
      console.error('❌ Invalid environment variables:');
      for (const issue of parsed.error.issues) {
        console.error(`  ${issue.path.join('.')}: ${issue.message}`);
      }
    }
    // Allow dev and Next.js build-time page data collection without live secrets
    if (process.env.NODE_ENV === 'development' || isBuildPhase) {
      return envSchema.parse({
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://teamtrail:teamtrail_dev@localhost:5432/teamtrail_dev',
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || 'dev-secret-change-in-production-must-be-16chars',
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
      });
    }
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

export const env = validateEnv();

function isConfiguredValue(val?: string): boolean {
  return !!val && val.trim().length > 0 && !val.trim().startsWith('CHANGE_ME');
}

export function isGitHubOAuthConfigured(): boolean {
  return isConfiguredValue(env.GITHUB_CLIENT_ID) && isConfiguredValue(env.GITHUB_CLIENT_SECRET);
}

export function isGitHubAppConfigured(): boolean {
  return (
    isConfiguredValue(env.GITHUB_APP_ID) &&
    isConfiguredValue(env.GITHUB_APP_PRIVATE_KEY) &&
    isConfiguredValue(env.GITHUB_WEBHOOK_SECRET)
  );
}
