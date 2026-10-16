// Per-adviser watchlist. Firm + owner scoped (RLS enforces user only touches
// their own rows). Every response returns the full current fund-id list so the
// client can just replace its state.
import { Hono, type Context } from 'hono';
import { and, eq } from 'drizzle-orm';
import { withTenant, schema, type DB } from '@nsights/db';
import type { AppEnv } from '../context';

export const watchlist = new Hono<AppEnv>();

function tctx(c: Context<AppEnv>) {
  const u = c.get('user'); const m = c.get('membership');
  if (!m) return null;
  return { firmId: m.firmId, userId: u.id, role: m.role };
}

async function list(tx: DB, userId: string): Promise<string[]> {
  const rows = await tx.select({ fundId: schema.watchlist.fundId })
    .from(schema.watchlist).where(eq(schema.watchlist.userId, userId));
  return rows.map((r) => r.fundId);
}

// GET /watchlist — this user's fund ids.
watchlist.get('/', async (c) => {
  const t = tctx(c); if (!t) return c.json({ error: 'no_firm' }, 403);
  const fundIds = await withTenant(t, (tx) => list(tx, t.userId));
  return c.json({ fundIds });
});

// POST /watchlist { fundId } — add (idempotent), returns full list.
watchlist.post('/', async (c) => {
  const t = tctx(c); if (!t) return c.json({ error: 'no_firm' }, 403);
  const b = (await c.req.json().catch(() => null)) as { fundId?: string } | null;
  if (!b?.fundId) return c.json({ error: 'fundId required' }, 400);
  const fundIds = await withTenant(t, async (tx) => {
    await tx.insert(schema.watchlist)
      .values({ firmId: t.firmId, userId: t.userId, fundId: b.fundId! })
      .onConflictDoNothing();
    return list(tx, t.userId);
  });
  return c.json({ fundIds });
});

// DELETE /watchlist/:fundId — remove, returns full list.
watchlist.delete('/:fundId', async (c) => {
  const t = tctx(c); if (!t) return c.json({ error: 'no_firm' }, 403);
  const fundId = c.req.param('fundId');
  const fundIds = await withTenant(t, async (tx) => {
    await tx.delete(schema.watchlist)
      .where(and(eq(schema.watchlist.userId, t.userId), eq(schema.watchlist.fundId, fundId)));
    return list(tx, t.userId);
  });
  return c.json({ fundIds });
});