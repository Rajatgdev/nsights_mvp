/** Applies rls.sql. Optionally re-asserts the app_user LOGIN role if
 *  APP_DB_PASSWORD is set (hardened path — deferred, see docs/deferred-work.md).
 *  Run: pnpm --filter @nsights/db apply-rls */
 import { readFile } from 'node:fs/promises';
 import { resolve } from 'node:path';
 import { config } from 'dotenv';
 import { Pool, neonConfig } from '@neondatabase/serverless';
 import ws from 'ws';
 
 config({ path: resolve(process.cwd(), '../../.env') });
 config({ path: resolve(process.cwd(), '.env') });
 
 if (typeof WebSocket === 'undefined') {
   neonConfig.webSocketConstructor = ws;
 }
 
 async function main() {
   const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
   if (!url) throw new Error('DATABASE_URL_UNPOOLED (or DATABASE_URL) is required');
 
   const rls = await readFile(resolve(import.meta.dirname, '../rls.sql'), 'utf8');
   const pool = new Pool({ connectionString: url });
   try {
     console.log('[apply-rls] applying rls.sql …');
     await pool.query(rls);
 
     const pw = process.env.APP_DB_PASSWORD;
     if (pw) {
       await pool.query(`ALTER ROLE app_user WITH LOGIN PASSWORD '${pw.replace(/'/g, "''")}'`);
       await pool.query('GRANT USAGE ON SCHEMA public TO app_user');
       console.log('[apply-rls] app_user login re-asserted.');
     } else {
       console.log('[apply-rls] APP_DB_PASSWORD not set — grants applied, login unchanged (MVP).');
     }
     console.log('[apply-rls] done.');
   } finally {
     await pool.end();
   }
 }
 
 main().catch((e) => { console.error(e); process.exit(1); });