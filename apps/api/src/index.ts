import './env'; // FIRST — loads .env before @nsights/db is imported
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import type { AppEnv } from './context';
import { sessionMiddleware } from './middleware/session';
import { auth } from './auth';
import { me } from './routes/me';
import { funds } from './routes/funds';
import { portfolios } from './routes/portfolios';
import { presentations } from './routes/presentations';
import { admin } from './routes/admin';
import { invites } from './routes/invites';
import { firm } from './routes/firm';
import { settings } from './routes/settings';
import { design } from './routes/design';

const app = new Hono<AppEnv>().basePath('/api');

// CORS — the web app (Vercel) calls this API (Railway) cross-origin with
// credentials, so the allowed origin must be the exact web URL, not '*'.
const WEB_ORIGIN = process.env.WEB_URL ?? 'http://localhost:5173';
app.use('*', cors({ origin: WEB_ORIGIN, credentials: true }));

app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }));

// Better Auth (sign-up/in/out, org endpoints) — mounted BEFORE the session gate.
app.on(['GET', 'POST'], '/auth/*', (c) => auth.handler(c.req.raw));

// Public: accept-invite flow (no session yet).
app.route('/invites', invites);

// Everything below requires a session.
app.use('*', sessionMiddleware);
app.route('/firm', firm);
app.route('/me', me);
app.route('/funds', funds);
app.route('/portfolios', portfolios);
app.route('/presentations', presentations);
app.route('/admin', admin);
app.route('/settings', settings);
app.route('/design', design);

const port = Number(process.env.PORT) || 8787; // Railway injects PORT
serve({ fetch: app.fetch, port });
console.log(`nSights API on :${port}`);

export type AppType = typeof app;