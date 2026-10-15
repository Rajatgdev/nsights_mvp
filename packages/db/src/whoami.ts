import { config } from 'dotenv';
import { resolve } from 'node:path';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });
if (typeof WebSocket === 'undefined') neonConfig.webSocketConstructor = ws;

const url = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: url });
const r = await pool.query(
  `select current_user as role,
          (select rolbypassrls from pg_roles where rolname = current_user) as bypassrls`);
console.log(r.rows[0]);
await pool.end();