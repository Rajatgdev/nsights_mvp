/** Cross-tenant RLS proof (spec §4.3/§13). Seeds two firms as owner, then
 *  proves that with Firm A's GUC set, Firm B's rows are invisible/unwritable.
 *  Skips (not fails) if DB env is absent. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });
if (typeof WebSocket === 'undefined') neonConfig.webSocketConstructor = ws;

const OWNER_URL = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const APP_URL = process.env.DATABASE_URL;
const hasEnv = Boolean(OWNER_URL && APP_URL);

const tag = `rlstest_${randomUUID().slice(0, 8)}`;
const firmA = randomUUID(); const firmB = randomUUID();
const userA = `${tag}_a`; const userB = `${tag}_b`;
const portA = randomUUID(); const portB = randomUUID();

const owner = hasEnv ? new Pool({ connectionString: OWNER_URL }) : null;
const app = hasEnv ? new Pool({ connectionString: APP_URL }) : null;

async function asFirm<T>(
  firmId: string, userId: string, role: string,
  fn: (q: (text: string, params?: unknown[]) => Promise<any>) => Promise<T>,
): Promise<T> {
  const client = await app!.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `select set_config('app.firm_id',$1,true),
              set_config('app.user_id',$2,true),
              set_config('app.role',$3,true)`,
      [firmId, userId, role],
    );
    const result = await fn((text, params) => client.query(text, params));
    await client.query('COMMIT');
    return result;
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

describe.skipIf(!hasEnv)('RLS cross-tenant isolation', () => {
  beforeAll(async () => {
    await owner!.query(
      `insert into organization (id,name,slug,seat_limit,status)
       values ($1,'Firm A',$2,5,'active'),($3,'Firm B',$4,5,'active')`,
      [firmA, `${tag}-a`, firmB, `${tag}-b`],
    );
    await owner!.query(
      `insert into "user" (id,email,name) values ($1,$2,'A'),($3,$4,'B')`,
      [userA, `${userA}@test.local`, userB, `${userB}@test.local`],
    );
    await owner!.query(
      `insert into portfolio (id,firm_id,kind,name) values
       ($1,$2,'house','A house'),($3,$4,'house','B house')`,
      [portA, firmA, portB, firmB],
    );
  }, 30_000);

  afterAll(async () => {
    if (!hasEnv) return;
    await owner!.query('delete from portfolio where id = any($1)', [[portA, portB]]);
    await owner!.query('delete from "user" where id = any($1)', [[userA, userB]]);
    await owner!.query('delete from organization where id = any($1)', [[firmA, firmB]]);
    await owner!.end(); await app!.end();
  });

  it('Firm A sees only its own portfolio', async () => {
    const rows = await asFirm(firmA, userA, 'firm_admin', async (q) =>
      (await q('select id, firm_id from portfolio')).rows as { id: string; firm_id: string }[]);
    expect(rows.every((r) => r.firm_id === firmA)).toBe(true);
    expect(rows.some((r) => r.id === portA)).toBe(true);
    expect(rows.some((r) => r.id === portB)).toBe(false);
  });

  it('Firm A cannot read Firm B by id', async () => {
    const n = await asFirm(firmA, userA, 'firm_admin', async (q) =>
      (await q('select count(*)::int as n from portfolio where id=$1', [portB])).rows[0].n as number);
    expect(n).toBe(0);
  });

  it('Firm A cannot UPDATE Firm B rows', async () => {
    const u = await asFirm(firmA, userA, 'firm_admin', async (q) =>
      (await q(`update portfolio set name='hacked' where id=$1`, [portB])).rowCount as number);
    expect(u).toBe(0);
  });

  it('Firm A cannot DELETE Firm B rows', async () => {
    const d = await asFirm(firmA, userA, 'firm_admin', async (q) =>
      (await q('delete from portfolio where id=$1', [portB])).rowCount as number);
    expect(d).toBe(0);
  });

  it('Firm A cannot INSERT a row tagged Firm B (WITH CHECK)', async () => {
    await expect(asFirm(firmA, userA, 'firm_admin', async (q) => {
      await q(`insert into portfolio (id,firm_id,kind,name) values ($1,$2,'house','sneaky')`,
        [randomUUID(), firmB]);
    })).rejects.toThrow();
  });

  it('Firm B sees only its own portfolio', async () => {
    const rows = await asFirm(firmB, userB, 'firm_admin', async (q) =>
      (await q('select id, firm_id from portfolio')).rows as { id: string; firm_id: string }[]);
    expect(rows.every((r) => r.firm_id === firmB)).toBe(true);
    expect(rows.some((r) => r.id === portB)).toBe(true);
    expect(rows.some((r) => r.id === portA)).toBe(false);
  });
});