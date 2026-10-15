import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '@nsights/db';
import type { Dataset, Fund } from '@nsights/shared';
import type { AppEnv } from '../context';

export const funds = new Hono<AppEnv>();

// GET /api/funds — the live fund list (metadata only, no price series).
funds.get('/', async (c) => {
  const r = await db.execute(sql`
    select dv.dataset
    from platform_state ps
    join data_version dv on dv.id = ps.live_version_id
    where ps.id = 1`);
  const row = r.rows[0] as { dataset?: Dataset } | undefined;
  if (!row?.dataset) return c.json({ error: 'no_live_data' }, 503);

  const ds = row.dataset;
  const list = ds.funds.map((f: Fund) => ({
    id: f.id, name: f.name, provider: f.provider,
    cls: f.cls, risk: f.risk, category: f.category, amc: f.amc,
  }));
  return c.json({ dataMonth: ds.updated, count: list.length, funds: list });
});