import { config } from 'dotenv';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });
if (typeof WebSocket === 'undefined') neonConfig.webSocketConstructor = ws;

// Seed runs as OWNER (writes platform-owned tables app_user can't write).
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL_UNPOOLED (or DATABASE_URL) is required');

const raw = await readFile(resolve(import.meta.dirname, 'dataset-default.json'), 'utf8');
const ds = JSON.parse(raw) as { updated: string; dates: string[]; funds: unknown[] };

const pool = new Pool({ connectionString: url });
try {
  const vid = (
    await pool.query(
      `insert into data_version (data_month, status, dataset, published_at)
       values ($1, 'live', $2::jsonb, now()) returning id`,
      [ds.updated, raw],
    )
  ).rows[0].id as string;

  await pool.query(
    `insert into platform_state (id, live_version_id, updated_at)
     values (1, $1, now())
     on conflict (id) do update
       set live_version_id = excluded.live_version_id, updated_at = now()`,
    [vid],
  );

  console.log(`seeded data_version ${vid} — data_month ${ds.updated}, funds ${ds.funds.length}`);
} finally {
  await pool.end();
}
process.exit(0);