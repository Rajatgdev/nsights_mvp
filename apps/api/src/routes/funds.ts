import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '@nsights/db';
import type { Dataset, Fund } from '@nsights/shared';
import type { AppEnv } from '../context';

export const funds = new Hono<AppEnv>();

async function liveDataset(): Promise<Dataset | null> {
  const r = await db.execute(sql`
    select dv.dataset
    from platform_state ps
    join data_version dv on dv.id = ps.live_version_id
    where ps.id = 1`);
  const row = r.rows[0] as { dataset?: Dataset } | undefined;
  return row?.dataset ?? null;
}

// GET /api/funds — the live fund list (metadata only, no price series).
funds.get('/', async (c) => {
  const ds = await liveDataset();
  if (!ds) return c.json({ error: 'no_live_data' }, 503);
  const list = ds.funds.map((f: Fund) => ({
    id: f.id, name: f.name, provider: f.provider,
    cls: f.cls, risk: f.risk, category: f.category, amc: f.amc,
  }));
  return c.json({ dataMonth: ds.updated, count: list.length, funds: list });
});

// GET /api/funds/series?ids=a,b,c — dates + full fund objects (with prices)
// for client-side calc. Omit ids = all funds.
funds.get('/series', async (c) => {
  const ds = await liveDataset();
  if (!ds) return c.json({ error: 'no_live_data' }, 503);
  const idsParam = c.req.query('ids');
  const wanted = idsParam ? new Set(idsParam.split(',').map((s) => s.trim())) : null;
  const funds = wanted ? ds.funds.filter((f) => wanted.has(f.id)) : ds.funds;
  return c.json({ dataMonth: ds.updated, dates: ds.dates, funds });
});