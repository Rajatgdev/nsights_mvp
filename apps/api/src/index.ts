import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { tenant } from './middleware/tenant';
import { funds } from './routes/funds';
import { portfolios } from './routes/portfolios';
import { presentations } from './routes/presentations';
import { admin } from './routes/admin';

const app = new Hono();

app.get('/api/health', (c) => c.json({ ok: true }));
// app.route('/api/auth', auth)            // Better Auth handler (port from stable)
app.use('/api/*', tenant);                 // session -> firm_id + RLS GUCs
app.route('/api/funds', funds);
app.route('/api/portfolios', portfolios);
app.route('/api/presentations', presentations);
app.route('/api/admin', admin);            // Kaben only: CSV upload + firms

serve({ fetch: app.fetch, port: 8787 });
console.log('nSights API on :8787');
