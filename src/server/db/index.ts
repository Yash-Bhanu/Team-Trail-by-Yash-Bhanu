// Database connection — server-only
import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '@/lib/env';

// Connection for queries (pooled)
const queryClient = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: env.NODE_ENV === 'production' ? 'require' : false,
});

export const db = drizzle(queryClient, { schema });

// For migrations only
export function createMigrationClient() {
  const migrationClient = postgres(env.DATABASE_URL, { max: 1 });
  return drizzle(migrationClient, { schema });
}

export type Database = typeof db;
