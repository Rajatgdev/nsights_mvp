// Firm-admin seat management (firm-scoped). A firm_admin lists their members +
// pending invites, invites adviser/assistant seats (seat-limited), changes a
// member's role/capabilities, and removes members or pending invites.
import { Hono, type Context } from 'hono';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { withTenant, schema, db } from '@nsights/db';
import type { AppEnv } from '../context';
import { requireFirmRole } from '../middleware/guard';
import { sendEmail } from '../email';

export const firm = new Hono<AppEnv>();
firm.use('*', requireFirmRole('firm_admin'));

function ctx(c: Context<AppEnv>) {
  const u = c.get('user'); const m = c.get('membership')!;
  return { firmId: m.firmId, userId: u.id, role: m.role };
}

// GET /firm/members — members + pending invites (reuses the platform detail fn
// with the caller's OWN firm id, so no cross-firm access).
firm.get('/members', async (c) => {
  const t = ctx(c);
  const r = await db.execute(sql`select * from platform_firm_detail(${t.firmId})`);
  const rows = r.rows as Array<{
    kind: string; user_id: string | null; email: string | null; name: string | null;
    role: string; can_download: boolean | null; can_edit: boolean | null;
    invite_id: string | null; invited_email: string | null; expires_at: string | null;
  }>;
  const members = rows.filter((x) => x.kind === 'member').map((x) => ({
    userId: x.user_id, email: x.email, name: x.name, role: x.role,
    canDownload: x.can_download, canEditHousePortfolios: x.can_edit,
  }));
  const invites = rows.filter((x) => x.kind === 'invite').map((x) => ({
    id: x.invite_id, email: x.invited_email, role: x.role, expiresAt: x.expires_at,
  }));
  const [org] = await withTenant(t, (tx) => tx.select({ seat: schema.organization.seatLimit }).from(schema.organization).where(eq(schema.organization.id, t.firmId)));
  return c.json({ members, invites, seatLimit: org?.seat ?? 0, seatsUsed: members.length + invites.length });
});

// POST /firm/invites { email, role } — invite an adviser/assistant seat.
firm.post('/invites', async (c) => {
  const t = ctx(c);
  const b = (await c.req.json().catch(() => null)) as { email?: string; role?: 'adviser' | 'assistant' } | null;
  if (!b?.email || !['adviser', 'assistant'].includes(b.role ?? '')) {
    return c.json({ error: 'email and role (adviser|assistant) required' }, 400);
  }
  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const out = await withTenant(t, async (tx) => {
    const [org] = await tx.select({ seat: schema.organization.seatLimit, name: schema.organization.name }).from(schema.organization).where(eq(schema.organization.id, t.firmId));
    const members = await tx.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, t.firmId));
    const pending = await tx.select({ id: schema.firmInvite.id }).from(schema.firmInvite).where(and(eq(schema.firmInvite.firmId, t.firmId), isNull(schema.firmInvite.acceptedAt)));
    if (members.length + pending.length >= (org?.seat ?? 0)) return { error: 'seat_limit' as const };
    await tx.insert(schema.firmInvite).values({ token, firmId: t.firmId, email: b.email!, role: b.role!, invitedBy: t.userId, expiresAt });
    return { firmName: org!.name };
  });
  if ('error' in out) return c.json({ error: 'seat_limit' }, 409);

  const link = `${process.env.WEB_URL ?? ''}/accept-invite/${token}`;
  await sendEmail({ to: b.email!, subject: `You've been invited to ${out.firmName} on nSights`, text: `Accept your invitation: ${link}` }).catch(() => { /* email best-effort; link is returned too */ });
  return c.json({ ok: true, link }, 201);
});

// DELETE /firm/invites/:id — revoke a pending invite.
firm.delete('/invites/:id', async (c) => {
  const t = ctx(c);
  await withTenant(t, (tx) => tx.delete(schema.firmInvite).where(and(eq(schema.firmInvite.id, c.req.param('id')), eq(schema.firmInvite.firmId, t.firmId))));
  return c.json({ ok: true });
});

// PATCH /firm/members/:userId — change role / capabilities.
firm.patch('/members/:userId', async (c) => {
  const t = ctx(c);
  const uid = c.req.param('userId');
  const b = (await c.req.json().catch(() => null)) as { role?: 'firm_admin' | 'adviser' | 'assistant'; canDownload?: boolean; canEditHousePortfolios?: boolean } | null;
  if (!b) return c.json({ error: 'invalid body' }, 400);
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (b.role) set.role = b.role;
  if (typeof b.canDownload === 'boolean') set.canDownload = b.canDownload;
  if (typeof b.canEditHousePortfolios === 'boolean') set.canEditHousePortfolios = b.canEditHousePortfolios;
  await withTenant(t, (tx) => tx.update(schema.member).set(set).where(and(eq(schema.member.userId, uid), eq(schema.member.organizationId, t.firmId))));
  return c.json({ ok: true });
});

// DELETE /firm/members/:userId — remove a member (not yourself).
firm.delete('/members/:userId', async (c) => {
  const t = ctx(c);
  const uid = c.req.param('userId');
  if (uid === t.userId) return c.json({ error: 'cannot_remove_self' }, 400);
  await withTenant(t, (tx) => tx.delete(schema.member).where(and(eq(schema.member.userId, uid), eq(schema.member.organizationId, t.firmId))));
  return c.json({ ok: true });
});