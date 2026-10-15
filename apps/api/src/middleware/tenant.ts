import type { MiddlewareHandler } from 'hono';
// Load session -> resolve active firm + role -> open a tx and set
// app.firm_id / app.user_id / app.role GUCs so Postgres RLS isolates the firm.
// REPLICATE the request pipeline from stable repo (spec §3.2).
export const tenant: MiddlewareHandler = async (_c, next) => {
  // TODO: Better Auth getSession, member lookup, withTenant tx
  await next();
};
