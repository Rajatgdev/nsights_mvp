import '../env';
import { db, schema } from '@nsights/db';
import { eq } from 'drizzle-orm';

const email = process.argv[2];
if (!email) {
  console.error('usage: tsx src/scripts/make-platform-admin.ts <email>');
  process.exit(1);
}

const [u] = await db
  .update(schema.user)
  .set({ role: 'platform_admin' })
  .where(eq(schema.user.email, email))
  .returning();

if (!u) {
  console.error(`no user with email ${email}`);
  process.exit(1);
}
console.log(`promoted ${u.email} -> platform_admin (${u.id})`);
process.exit(0);