import { Hono } from 'hono';
// CRUD + /:id/analyse (blend, risk class, warnings) + /suggest (rules engine). House + personal, RLS-scoped.
export const portfolios = new Hono();
portfolios.get('/', (c) => c.json({ milestone: 'portfolios — TODO' }, 501));
