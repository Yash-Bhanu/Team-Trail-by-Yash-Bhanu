// Secure Local Administrator Bootstrapping Script
// Usage: npx tsx scripts/bootstrap-admin.ts <user-email>
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../src/server/db/schema';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx tsx scripts/bootstrap-admin.ts <user-email>');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = postgres(dbUrl, { max: 1 });
  const db = drizzle(client, { schema });

  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });

  if (!user) {
    console.error(`No user found with email: ${email}. Sign in via GitHub OAuth first.`);
    await client.end();
    process.exit(1);
  }

  await db
    .insert(schema.profiles)
    .values({
      userId: user.id,
      role: 'admin',
      displayName: user.name,
      isActive: true,
      onboardedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.profiles.userId,
      set: { role: 'admin', isActive: true, updatedAt: new Date() },
    });

  await db.insert(schema.auditLog).values({
    userId: user.id,
    action: 'admin:bootstrap',
    resourceType: 'profile',
    resourceId: user.id,
    metadata: { method: 'local-cli-script' },
  });

  console.log(`Promoted ${email} (userId=${user.id}) to admin.`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
