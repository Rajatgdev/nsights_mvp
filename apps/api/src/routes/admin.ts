import { Hono } from 'hono';
import { sql, eq } from 'drizzle-orm';
import { randomUUID, randomBytes } from 'node:crypto';
import { db, schema, withTenant } from '@nsights/db';
import type { AppEnv } from '../context';
import { requirePlatformAdmin } from '../middleware/guard';
import { auth } from '../auth';
import { sendEmail } from '../email';

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

// One firm's members + pending invites (platform view, bypasses RLS via SECDEF).
admin.get('/firms/:id', async (c) => {
  const firmId = c.req.param('id');
  const r = await db.execute(sql`select * from platform_firm_detail(${firmId})`);
  const rows = r.rows as Array<{
    kind: string; user_id: string | null; email: string | null; name: string | null;
    role: string; can_download: boolean | null; can_edit: boolean | null;
    invite_id: string | null; invited_email: string | null; expires_at: string | null;
  }>;
  return c.json({
    members: rows.filter((x) => x.kind === 'member').map((x) => ({ userId: x.user_id, email: x.email, name: x.name, role: x.role, canDownload: x.can_download })),
    invites: rows.filter((x) => x.kind === 'invite').map((x) => ({ id: x.invite_id, email: x.invited_email, role: x.role, expiresAt: x.expires_at })),
  });
});

// Create a firm. Two modes:
//  - invite mode (default): creates the firm + a firm_admin invite link.
//  - direct mode: pass adminPassword to create the admin user immediately.
admin.post('/firms', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    name?: string; slug?: string; seatLimit?: number;
    adminEmail?: string; adminName?: string; adminPassword?: string;
  } | null;
  if (!body?.name || !body.slug || !body.adminEmail) {
    return c.json({ error: 'name, slug, adminEmail required' }, 400);
  }
  const firmId = randomUUID();
  const platformUserId = c.get('user').id;

  // Direct mode — create the admin user now.
  if (body.adminPassword) {
    let adminUserId: string;
    try {
      const signUp = await auth.api.signUpEmail({ body: { email: body.adminEmail, password: body.adminPassword, name: body.adminName ?? body.adminEmail } });
      adminUserId = signUp.user.id;
    } catch {
      return c.json({ error: 'admin user could not be created (email may already exist)' }, 409);
    }
    await withTenant({ firmId, userId: platformUserId, role: 'platform_admin' }, async (tx) => {
      await tx.insert(schema.organization).values({ id: firmId, name: body.name!, slug: body.slug!, seatLimit: body.seatLimit ?? 5, status: 'active' });
      await tx.insert(schema.member).values({ organizationId: firmId, userId: adminUserId, role: 'firm_admin', canEditHousePortfolios: true, canDownload: true });
      await tx.insert(schema.firmSettings).values({ firmId });
    });
    return c.json({ firm: { id: firmId, name: body.name, slug: body.slug }, admin: { id: adminUserId, email: body.adminEmail } }, 201);
  }

  // Invite mode — create the firm + a firm_admin invite link (no user yet).
  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await withTenant({ firmId, userId: platformUserId, role: 'platform_admin' }, async (tx) => {
    await tx.insert(schema.organization).values({ id: firmId, name: body.name!, slug: body.slug!, seatLimit: body.seatLimit ?? 5, status: 'active' });
    await tx.insert(schema.firmSettings).values({ firmId });
    await tx.insert(schema.firmInvite).values({ token, firmId, email: body.adminEmail!, role: 'firm_admin', invitedBy: platformUserId, expiresAt });
  });
  const link = `${process.env.WEB_URL ?? ''}/accept-invite/${token}`;
  await sendEmail({ to: body.adminEmail, subject: `You've been invited to run ${body.name} on nSights`, text: `Set up your firm admin account: ${link}` }).catch(() => { /* link returned too */ });
  return c.json({ firm: { id: firmId, name: body.name, slug: body.slug }, inviteLink: link }, 201);
});

// Seat limit / status (suspend|activate).
admin.patch('/firms/:id', async (c) => {
  const firmId = c.req.param('id');
  const b = (await c.req.json().catch(() => null)) as { seatLimit?: number; status?: 'active' | 'paused' } | null;
  if (!b) return c.json({ error: 'invalid body' }, 400);
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof b.seatLimit === 'number' && b.seatLimit > 0) set.seatLimit = b.seatLimit;
  if (b.status === 'active' || b.status === 'paused') set.status = b.status; // paused = suspended (blocks writes)
  await db.update(schema.organization).set(set).where(eq(schema.organization.id, firmId));
  return c.json({ ok: true });
});