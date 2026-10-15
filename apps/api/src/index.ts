import './env'; // FIRST — loads .env before @nsights/db is imported
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import type { AppEnv } from './context';
import { sessionMiddleware } from './middleware/session';
import { auth } from './auth';
import { me } from './routes/me';
import { funds } from './routes/funds';
import { portfolios } from './routes/portfolios';
import { presentations } from './routes/presentations';
import { admin } from './routes/admin';
import { settings } from './routes/settings';
import { design } from './routes/design';

const app = new Hono<AppEnv>().basePath('/api');

app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }));

// Better Auth (sign-up/in/out, org endpoints) — mounted BEFORE the session gate.
app.on(['GET', 'POST'], '/auth/*', (c) => auth.handler(c.req.raw));

// Everything below requires a session.
app.use('*', sessionMiddleware);
app.route('/me', me);
app.route('/funds', funds);
app.route('/portfolios', portfolios);
app.route('/presentations', presentations);
app.route('/admin', admin);
app.route('/settings', settings);
app.route('/design', design);

serve({ fetch: app.fetch, port: 8787 });
console.log('nSights API on http://localhost:8787');

export type AppType = typeof app;