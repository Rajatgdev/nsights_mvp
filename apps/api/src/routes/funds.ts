import { Hono } from 'hono';
// GET /funds (live data_version blob), /funds/:id, /funds/suggestions. POST /charts/:key/data -> recompute from selected funds + window.
export const funds = new Hono();
funds.get('/', (c) => c.json({ milestone: 'funds — TODO' }, 501));
