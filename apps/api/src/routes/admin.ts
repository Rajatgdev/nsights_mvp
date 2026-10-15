import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db, schema, withTenant } from '@nsights/db';
import type { AppEnv } from '../context';
import { requirePlatformAdmin } from '../middleware/guard';
import { auth } from '../auth';

export const admin = new Hono<AppEnv>();
admin.use('*', requirePlatformAdmin());

// Headcount + roles per firm. Never firm content.
admin.get('/firms', async (c) => {
  const r = await db.execute(sql`select * from platform_firm_summary() order by name`);
  const firms = (r.rows as Array<{
    firm_id: string; name: string; slug: string; status: string;
    seat_limit: number; members: string; admins: string;
  }>).map((f) => ({
    id: f.firm_id, name: f.name, slug: f.slug, status: f.status,
    seatLimit: Number(f.seat_limit), members: Number(f.members), admins: Number(f.admins),
  }));
  return c.json({ firms });
});

// Create a firm + its first firm_admin (spec §1 onboarding).
admin.post('/firms', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    name?: string; slug?: string; seatLimit?: number;
    adminEmail?: string; adminName?: string; adminPassword?: string;
  } | null;
  if (!body?.name || !body.slug || !body.adminEmail || !body.adminPassword) {
    return c.json({ error: 'name, slug, adminEmail, adminPassword required' }, 400);
  }

  // 1. Create the firm_admin user (global role stays 'user'; firm role is in member).
  let adminUserId: string;
  try {
    const signUp = await auth.api.signUpEmail({
      body: { email: body.adminEmail, password: body.adminPassword, name: body.adminName ?? body.adminEmail },
    });
    adminUserId = signUp.user.id;
  } catch {
    return c.json({ error: 'admin user could not be created (email may already exist)' }, 409);
  }

  // 2. Firm + membership + settings, in one tenant-scoped tx (RLS checks firm_id).
  const firmId = randomUUID();
  await withTenant({ firmId, userId: c.get('user').id, role: 'platform_admin' }, async (tx) => {
    await tx.insert(schema.organization).values({
      id: firmId, name: body.name!, slug: body.slug!,
      seatLimit: body.seatLimit ?? 5, status: 'active',
    });
    await tx.insert(schema.member).values({
      organizationId: firmId, userId: adminUserId, role: 'firm_admin',
      canEditHousePortfolios: true, canDownload: true,
    });
    await tx.insert(schema.firmSettings).values({ firmId });
  });

  return c.json({ firm: { id: firmId, name: body.name, slug: body.slug }, admin: { id: adminUserId, email: body.adminEmail } }, 201);
});