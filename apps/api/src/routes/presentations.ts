import { Hono } from 'hono';
// CRUD + slides + reorder. Stores the on-the-go deck. Export = client-side PNG; server just persists slide state + records downloads.
export const presentations = new Hono();
presentations.get('/', (c) => c.json({ milestone: 'presentations — TODO' }, 501));
