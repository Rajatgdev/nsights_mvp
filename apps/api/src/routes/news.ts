// Dashboard news. GET is open to any signed-in user (platform-global content);
// create/edit/delete are platform_admin (Kaben) only. Writes run through
// withTenant with an empty firm id purely to set app.role = platform_admin,
// which the news_write RLS policy checks (see rls.sql).
import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { db, schema, withTenant } from '@nsights/db';
import type { AppEnv } from '../context';
import { requirePlatformAdmin } from '../middleware/guard';

export const news = new Hono<AppEnv>();

const platformCtx = (userId: string) => ({ firmId: '', userId, role: 'platform_admin' });

// GET /news — newest first, for everyone's dashboard.
news.get('/', async (c) => {
  const rows = await db.select().from(schema.news).orderBy(desc(schema.news.publishedAt)).limit(50);
  return c.json({ news: rows });
});

// POST /news — publish (platform_admin).
news.post('/', requirePlatformAdmin(), async (c) => {
  const b = (await c.req.json().catch(() => null)) as {
    title?: string; source?: string; body?: string; url?: string; publishedAt?: string;
  } | null;
  if (!b?.title || !b.source || !b.body) {
    return c.json({ error: 'title, source and body are required' }, 400);
  }
  const [row] = await withTenant(platformCtx(c.get('user').id), (tx) =>
    tx.insert(schema.news).values({
      title: b.title!, source: b.source!, body: b.body!,
      url: b.url || null,
      publishedAt: b.publishedAt ? new Date(b.publishedAt) : new Date(),
      createdBy: c.get('user').id,
    }).returning(),
  );
  return c.json({ news: row }, 201);
});

// PATCH /news/:id — edit (platform_admin).
news.patch('/:id', requirePlatformAdmin(), async (c) => {
  const id = c.req.param('id');
  const b = (await c.req.json().catch(() => null)) as {
    title?: string; source?: string; body?: string; url?: string; publishedAt?: string;
  } | null;
  if (!b) return c.json({ error: 'invalid body' }, 400);
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (b.title != null) set.title = b.title;
  if (b.source != null) set.source = b.source;
  if (b.body != null) set.body = b.body;
  if (b.url !== undefined) set.url = b.url || null;
  if (b.publishedAt) set.publishedAt = new Date(b.publishedAt);
  const [row] = await withTenant(platformCtx(c.get('user').id), (tx) =>
    tx.update(schema.news).set(set).where(eq(schema.news.id, id)).returning(),
  );
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({ news: row });
});

// DELETE /news/:id — remove (platform_admin).
news.delete('/:id', requirePlatformAdmin(), async (c) => {
  const id = c.req.param('id');
  await withTenant(platformCtx(c.get('user').id), (tx) =>
    tx.delete(schema.news).where(eq(schema.news.id, id)),
  );
  return c.json({ ok: true });
});