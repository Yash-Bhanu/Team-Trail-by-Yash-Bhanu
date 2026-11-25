// Health check endpoint — reveals only minimal operational status
import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  let dbStatus: 'ok' | 'unavailable' = 'unavailable';

  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = 'ok';
  } catch {
    dbStatus = 'unavailable';
  }

  return NextResponse.json(
    {
      status: dbStatus === 'ok' ? 'healthy' : 'degraded',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    },
    { status: dbStatus === 'ok' ? 200 : 503 }
  );
}
