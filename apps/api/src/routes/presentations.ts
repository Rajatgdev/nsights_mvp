// Exported decks — the .pptx files an adviser downloads, persisted to Blob +
// Neon so "Recent presentations" and re-download work on any device. Firm +
// owner scoped (RLS). The deck is generated client-side; the browser uploads
// the finished file here.
import { Hono, type Context } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { withTenant, schema, db } from '@nsights/db';
import type { AppEnv } from '../context';
import { putObject, deleteObject } from '../lib/blob';

export const presentations = new Hono<AppEnv>();

const MAX_BYTES = 30 * 1024 * 1024; // 30 MB
function tctx(c: Context<AppEnv>) {
  const u = c.get('user'); const m = c.get('membership');
  if (!m) return null;
  return { firmId: m.firmId, userId: u.id, role: m.role };
}

// GET /presentations — this user's exported decks, newest first.
presentations.get('/', async (c) => {
  const t = tctx(c); if (!t) return c.json({ error: 'no_firm' }, 403);
  const rows = await withTenant(t, (tx) =>
    tx.select().from(schema.exportedDeck).where(eq(schema.exportedDeck.userId, t.userId)).orderBy(desc(schema.exportedDeck.createdAt)),
  );
  return c.json({
    presentations: rows.map((r) => ({
      id: r.id, name: r.name, slideCount: r.slideCount, date: r.createdAt, url: r.url, sizeBytes: r.sizeBytes,
    })),
  });
});

// POST /presentations — multipart: file (.pptx), name, slideCount.
presentations.post('/', async (c) => {
  const t = tctx(c); if (!t) return c.json({ error: 'no_firm' }, 403);
  const body = await c.req.parseBody();
  const file = body['file'];
  const name = typeof body['name'] === 'string' && body['name'].trim() ? (body['name'] as string).trim() : 'Client Presentation';
  const slideCount = Number(body['slideCount']) || 0;
  if (!(file instanceof File)) return c.json({ error: 'file is required' }, 400);
  if (file.size > MAX_BYTES) return c.json({ error: 'file too large' }, 400);

  const buf = Buffer.from(await file.arrayBuffer());
  const put = await putObject(`export-decks/${t.firmId}/${file.name || 'deck.pptx'}`, buf, file.type || 'application/vnd.openxmlformats-officedocument.presentationml.presentation');

  const [row] = await withTenant(t, (tx) =>
    tx.insert(schema.exportedDeck).values({
      firmId: t.firmId, userId: t.userId, name, slideCount,
      storageKey: put.pathname, url: put.url, sizeBytes: file.size,
    }).returning(),
  );
  return c.json({ presentation: { id: row.id, name: row.name, slideCount: row.slideCount, date: row.createdAt, url: row.url } }, 201);
});

// DELETE /presentations/:id — remove record + blob (own only).
presentations.delete('/:id', async (c) => {
  const t = tctx(c); if (!t) return c.json({ error: 'no_firm' }, 403);
  const id = c.req.param('id');
  const [row] = await db.select().from(schema.exportedDeck).where(eq(schema.exportedDeck.id, id));
  if (row?.url) await deleteObject(row.url);
  await withTenant(t, (tx) => tx.delete(schema.exportedDeck).where(eq(schema.exportedDeck.id, id)));
  return c.json({ ok: true });
});