// Insights decks — PLATFORM-GLOBAL files (Kaben uploads, every firm sees them).
// Stored in Vercel Blob; metadata in `asset` (kind 'insight_deck', firm_id NULL).
// On a PDF upload we also rasterize each page to a PNG ('insight_slide' rows,
// parent_id = the deck) so firms can drop author slides into their own decks
// from the "From nSights" tab. GET is open to any signed-in user; upload/delete
// are platform_admin only. Public Blob store → the stored url is the link.
import { Hono } from 'hono';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { pdf } from 'pdf-to-img';
import { db, schema, withTenant } from '@nsights/db';
import type { AppEnv } from '../context';
import { requirePlatformAdmin } from '../middleware/guard';
import { putObject, deleteObject } from '../lib/blob';

export const insights = new Hono<AppEnv>();

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const OK_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // .ppt
]);
const platformCtx = (userId: string) => ({ firmId: '', userId, role: 'platform_admin' });

// GET /insights/decks — list platform decks, newest first (every firm).
insights.get('/decks', async (c) => {
  const rows = await db.select().from(schema.asset)
    .where(and(eq(schema.asset.kind, 'insight_deck'), isNull(schema.asset.firmId)))
    .orderBy(desc(schema.asset.createdAt));
  return c.json({
    decks: rows.map((a) => ({
      id: a.id, title: a.title ?? a.filename, filename: a.filename,
      url: a.url, contentType: a.contentType, sizeBytes: a.sizeBytes, createdAt: a.createdAt,
    })),
  });
});

// GET /insights/slides — author slide pages grouped by deck (for the "From
// nSights" tab). Only decks that were rasterized (PDFs) appear here.
insights.get('/slides', async (c) => {
  const decks = await db.select().from(schema.asset)
    .where(and(eq(schema.asset.kind, 'insight_deck'), isNull(schema.asset.firmId)))
    .orderBy(desc(schema.asset.createdAt));
  const pages = await db.select().from(schema.asset)
    .where(and(eq(schema.asset.kind, 'insight_slide'), isNull(schema.asset.firmId)))
    .orderBy(asc(schema.asset.sortIndex));
  const byDeck = new Map<string, Array<{ id: string; url: string; title: string | null; index: number | null }>>();
  for (const p of pages) {
    if (!p.parentId) continue;
    if (!byDeck.has(p.parentId)) byDeck.set(p.parentId, []);
    byDeck.get(p.parentId)!.push({ id: p.id, url: p.url, title: p.title, index: p.sortIndex });
  }
  const out = decks
    .filter((d) => byDeck.has(d.id))
    .map((d) => ({ id: d.id, title: d.title ?? d.filename, pages: byDeck.get(d.id)! }));
  return c.json({ decks: out });
});

// POST /insights/decks — upload (platform_admin). multipart: file + title.
insights.post('/decks', requirePlatformAdmin(), async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  const title = typeof body['title'] === 'string' ? (body['title'] as string).trim() : '';
  if (!(file instanceof File)) return c.json({ error: 'file is required' }, 400);
  if (!OK_TYPES.has(file.type)) return c.json({ error: 'only PDF or PowerPoint files are allowed' }, 400);
  if (file.size > MAX_BYTES) return c.json({ error: 'file is larger than 25MB' }, 400);

  const buf = Buffer.from(await file.arrayBuffer());
  const put = await putObject(`insight-decks/${file.name}`, buf, file.type);
  const deckTitle = title || file.name;

  const [deck] = await withTenant(platformCtx(c.get('user').id), (tx) =>
    tx.insert(schema.asset).values({
      firmId: null, kind: 'insight_deck',
      storageKey: put.pathname, url: put.url,
      filename: file.name, contentType: file.type, sizeBytes: file.size,
      title: deckTitle, uploadedBy: c.get('user').id,
    }).returning(),
  );

  // PDFs: rasterize each page → insight_slide rows so firms can reuse them.
  // Best-effort — a rasterize failure still leaves the deck downloadable.
  let pageCount = 0;
  if (file.type === 'application/pdf') {
    try {
      const doc = await pdf(buf, { scale: 2 });
      let i = 0;
      for await (const page of doc) {
        const key = `insight-slides/${deck.id}/p${i + 1}.png`;
        const up = await putObject(key, page, 'image/png');
        await withTenant(platformCtx(c.get('user').id), (tx) =>
          tx.insert(schema.asset).values({
            firmId: null, kind: 'insight_slide', parentId: deck.id, sortIndex: i,
            storageKey: up.pathname, url: up.url,
            filename: `${file.name}#p${i + 1}`, contentType: 'image/png', sizeBytes: page.length,
            title: `${deckTitle} — ${i + 1}`, uploadedBy: c.get('user').id,
          }),
        );
        i++;
      }
      pageCount = i;
    } catch (e) {
      console.error('rasterize failed', e);
    }
  }
  return c.json({ deck: { id: deck.id, title: deck.title, url: deck.url, filename: deck.filename, pages: pageCount } }, 201);
});

// DELETE /insights/decks/:id — remove the deck, its page images, and all blobs.
insights.delete('/decks/:id', requirePlatformAdmin(), async (c) => {
  const id = c.req.param('id');
  const [deck] = await db.select().from(schema.asset).where(eq(schema.asset.id, id));
  const pages = await db.select().from(schema.asset)
    .where(and(eq(schema.asset.kind, 'insight_slide'), eq(schema.asset.parentId, id)));
  for (const p of pages) if (p.url) await deleteObject(p.url);
  if (deck?.url) await deleteObject(deck.url);
  await withTenant(platformCtx(c.get('user').id), async (tx) => {
    await tx.delete(schema.asset).where(eq(schema.asset.parentId, id));
    await tx.delete(schema.asset).where(eq(schema.asset.id, id));
  });
  return c.json({ ok: true });
});