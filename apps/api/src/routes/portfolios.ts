import { Hono, type Context } from 'hono';
import { eq } from 'drizzle-orm';
import { withTenant, schema } from '@nsights/db';
import type { AppEnv } from '../context';

export const portfolios = new Hono<AppEnv>();

function ctx(c: Context<AppEnv>) {
  const u = c.get('user');
  const m = c.get('membership');
  return m ? { firmId: m.firmId, userId: u.id, role: m.role, canEditHouse: m.canEditHousePortfolios } : null;
}

// GET /api/portfolios — list (RLS: house + own personal + firm_admin sees all)
portfolios.get('/', async (c) => {
  const t = ctx(c); if (!t) return c.json({ error: 'no_firm' }, 403);
  const rows = await withTenant(t, (tx) => tx.select().from(schema.portfolio));
  return c.json({
    portfolios: rows.map((p) => ({ id: p.id, name: p.name, kind: p.kind, approach: p.approach, ownerUserId: p.ownerUserId })),
  });
});

// POST /api/portfolios — create with holdings
portfolios.post('/', async (c) => {
  const t = ctx(c); if (!t) return c.json({ error: 'no_firm' }, 403);
  const body = (await c.req.json().catch(() => null)) as {
    name?: string; kind?: 'house' | 'personal'; approach?: string; description?: string;
    holdings?: { fundId: string; weightBp: number; role?: 'core' | 'satellite' }[];
  } | null;
  if (!body?.name || !body.kind || !Array.isArray(body.holdings) || body.holdings.length === 0) {
    return c.json({ error: 'name, kind, holdings required' }, 400);
  }
  if (body.kind === 'house' && t.role !== 'firm_admin' && !t.canEditHouse) {
    return c.json({ error: 'forbidden' }, 403);
  }
  const id = await withTenant(t, async (tx) => {
    const [p] = await tx.insert(schema.portfolio).values({
      firmId: t.firmId,
      ownerUserId: body.kind === 'personal' ? t.userId : null,
      kind: body.kind!,
      name: body.name!,
      description: body.description ?? null,
      approach: (body.approach ?? null) as never,
    }).returning({ id: schema.portfolio.id });
    await tx.insert(schema.portfolioHolding).values(
      body.holdings!.map((h) => ({
        portfolioId: p.id, firmId: t.firmId, fundId: h.fundId, weightBp: h.weightBp, role: (h.role ?? null) as never,
      })),
    );
    return p.id;
  });
  return c.json({ id }, 201);
});

// GET /api/portfolios/:id — one with holdings
portfolios.get('/:id', async (c) => {
  const t = ctx(c); if (!t) return c.json({ error: 'no_firm' }, 403);
  const id = c.req.param('id');
  const res = await withTenant(t, async (tx) => {
    const [p] = await tx.select().from(schema.portfolio).where(eq(schema.portfolio.id, id));
    if (!p) return null;
    const h = await tx.select().from(schema.portfolioHolding).where(eq(schema.portfolioHolding.portfolioId, id));
    return { p, h };
  });
  if (!res) return c.json({ error: 'not_found' }, 404);
  return c.json({
    portfolio: {
      id: res.p.id, name: res.p.name, kind: res.p.kind, approach: res.p.approach,
      holdings: res.h.map((x) => ({ fundId: x.fundId, weightBp: x.weightBp, role: x.role })),
    },
  });
});

// DELETE /api/portfolios/:id
portfolios.delete('/:id', async (c) => {
  const t = ctx(c); if (!t) return c.json({ error: 'no_firm' }, 403);
  const id = c.req.param('id');
  await withTenant(t, (tx) => tx.delete(schema.portfolio).where(eq(schema.portfolio.id, id)));
  return c.json({ ok: true });
});