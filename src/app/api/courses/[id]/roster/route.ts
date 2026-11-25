// CSV Roster Import API — mentor-only, enforces row/size limits, validates schema, never grants admin/mentor roles via CSV
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/server/auth/session';
import { enforce, AuthorizationError } from '@/server/authorization';
import { csvRosterRowSchema } from '@/lib/validations';
import { db } from '@/server/db';
import { invitations, teams } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { generateSecureToken, hashToken } from '@/lib/utils';
import { validateOrigin, recordAuditEvent, getClientIp } from '@/server/security/csrf';
import { checkRateLimit, getRateLimitHeaders } from '@/server/security/rate-limiter';

const MAX_CSV_ROWS = 500;
const MAX_CSV_BYTES = 512 * 1024; // 512 KB

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const { id: courseId } = await context.params;
    const user = await requireAuthUser();
    await enforce(user, 'course:import_roster', { courseId });

    const rl = await checkRateLimit(user.id, 'csv:import');
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getRateLimitHeaders(rl) });
    }

    const body = await request.json();
    const csvText = typeof body?.csv === 'string' ? body.csv : '';
    const dryRun = Boolean(body?.dryRun);

    if (!csvText || Buffer.byteLength(csvText, 'utf8') > MAX_CSV_BYTES) {
      return NextResponse.json({ error: 'CSV payload missing or exceeds 512KB limit' }, { status: 400 });
    }

    const lines = csvText
      .split(/\r?\n/)
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    if (lines.length < 2 || lines.length - 1 > MAX_CSV_ROWS) {
      return NextResponse.json(
        { error: `CSV must contain a header and between 1 and ${MAX_CSV_ROWS} rows` },
        { status: 400 }
      );
    }

    const validRows: Array<{ email: string; name: string; teamName?: string }> = [];
    const errors: Array<{ row: number; message: string }> = [];
    const seenEmails = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i]!.split(',').map((c: string) => c.trim().replace(/^"|"$/g, ''));
      const [email, name, teamName] = cols;
      const parsed = csvRosterRowSchema.safeParse({
        email,
        name,
        teamName: teamName || undefined,
        role: 'student', // Never allow CSV to grant privileged roles
      });

      if (!parsed.success) {
        errors.push({ row: i + 1, message: 'Invalid email or name' });
        continue;
      }

      const normalizedEmail = parsed.data.email.toLowerCase();
      if (seenEmails.has(normalizedEmail)) {
        errors.push({ row: i + 1, message: `Duplicate email: ${normalizedEmail}` });
        continue;
      }
      seenEmails.add(normalizedEmail);
      validRows.push({
        email: normalizedEmail,
        name: parsed.data.name,
        teamName: parsed.data.teamName,
      });
    }

    if (dryRun) {
      return NextResponse.json({ preview: true, validCount: validRows.length, errors, validRows });
    }

    const existingTeams = await db.query.teams.findMany({ where: eq(teams.courseId, courseId) });
    const teamMap = new Map(existingTeams.map((t) => [t.name.toLowerCase(), t.id]));

    let createdInvites = 0;
    for (const row of validRows) {
      let teamId = row.teamName ? teamMap.get(row.teamName.toLowerCase()) : undefined;
      if (row.teamName && !teamId) {
        const [newTeam] = await db
          .insert(teams)
          .values({ courseId, name: row.teamName })
          .returning();
        teamId = newTeam!.id;
        teamMap.set(row.teamName.toLowerCase(), teamId);
      }

      const rawToken = await generateSecureToken(24);
      const tokenHash = await hashToken(rawToken);
      await db.insert(invitations).values({
        tokenHash,
        courseId,
        teamId: teamId ?? null,
        role: 'student',
        email: row.email,
        maxUses: 1,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        createdById: user.id,
      });
      createdInvites++;
    }

    await recordAuditEvent({
      userId: user.id,
      action: 'course:import_roster',
      resourceType: 'course',
      resourceId: courseId,
      metadata: { createdInvites, errorCount: errors.length },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ createdInvites, errors }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
