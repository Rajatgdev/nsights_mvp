// PUBLIC routes (mounted BEFORE the session gate): the accept-invite flow runs
// before the invitee has a session. Lookups + the privileged member insert go
// through SECURITY DEFINER functions (invite_by_token / accept_invite) so RLS
// doesn't block a user who has no firm context yet.
import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '@nsights/db';
import { auth } from '../auth';

export const invites = new Hono();

// GET /invites/:token — what the accept page shows (firm + email), pre-login.
invites.get('/:token', async (c) => {
  const token = c.req.param('token');
  const r = await db.execute(sql`select * from invite_by_token(${token})`);
  const row = r.rows[0] as { firm_name: string; email: string; role: string; valid: boolean } | undefined;
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({ firmName: row.firm_name, email: row.email, role: row.role, valid: row.valid });
});

// POST /invites/:token/accept { password, name? } — new user signs up + joins.
invites.post('/:token/accept', async (c) => {
  const token = c.req.param('token');
  const body = (await c.req.json().catch(() => null)) as { password?: string; name?: string } | null;

  const r = await db.execute(sql`select * from invite_by_token(${token})`);
  const inv = r.rows[0] as { firm_name: string; email: string; role: string; valid: boolean } | undefined;
  if (!inv || !inv.valid) return c.json({ error: 'invalid_invite' }, 400);
  if (!body?.password || body.password.length < 8) return c.json({ error: 'password_too_short' }, 400);

  let userId: string;
  try {
    const su = await auth.api.signUpEmail({ body: { email: inv.email, password: body.password, name: body.name ?? inv.email } });
    userId = su.user.id;
  } catch {
    // Email already has an account — they should sign in, then accept.
    return c.json({ error: 'account_exists', message: 'An account already exists for this email. Sign in, then open the invite link again.' }, 409);
  }

  const a = await db.execute(sql`select accept_invite(${token}, ${userId}) as firm_id`);
  const firmId = (a.rows[0] as { firm_id: string | null } | undefined)?.firm_id ?? null;
  if (!firmId) return c.json({ error: 'accept_failed', message: 'Invite expired, already used, or the firm is at its seat limit.' }, 409);

  return c.json({ ok: true, firmId, email: inv.email });
});