import { Hono, type Context } from 'hono';
import { eq } from 'drizzle-orm';
import { withTenant, schema, db } from '@nsights/db';
import type { AppEnv } from '../context';
import { putObject, deleteObject } from '../lib/blob';

// Turn whatever logo value the client sent into the value we store on
// organization.logo: a Blob URL. A data: URL is a fresh upload (→ Blob); an
// http(s) URL is the already-stored logo (keep); null/empty clears it. The old
// Blob (if any) is deleted on replace/clear so logos don't orphan. Keeps the DB
// lean (a URL string instead of a huge data URL).
async function resolveLogo(firmId: string, incoming: string | null | undefined): Promise<string | null> {
  const [org] = await db.select({ logo: schema.organization.logo }).from(schema.organization).where(eq(schema.organization.id, firmId));
  const current = org?.logo ?? null;
  const val = (incoming ?? '').trim();

  if (val === '') { // cleared
    if (current && /^https?:/.test(current)) await deleteObject(current);
    return null;
  }
  if (val.startsWith('data:')) { // new upload
    const m = /^data:([^;]+);base64,(.*)$/s.exec(val);
    if (!m) return current; // not base64 — leave as-is
    const mime = m[1];
    const buf = Buffer.from(m[2], 'base64');
    const ext = mime.includes('png') ? 'png' : mime.includes('svg') ? 'svg' : mime.includes('jpeg') ? 'jpg' : 'img';
    const up = await putObject(`logos/${firmId}.${ext}`, buf, mime);
    if (current && /^https?:/.test(current)) await deleteObject(current);
    return up.url;
  }
  return val; // already an http(s) URL — keep
}

export const design = new Hono<AppEnv>();

function ctx(c: Context<AppEnv>) {
  const u = c.get('user');
  const m = c.get('membership');
  return m ? { firmId: m.firmId, userId: u.id, role: m.role } : null;
}

const clean = (v: string | null | undefined) => { const s = (v ?? '').trim(); return s === '' ? null : s; };
const TEMPLATES = ['boardroom', 'editorial', 'monoline', 'midnight'];

interface DesignBody {
  templateId?: string; paletteId?: string; accentHex?: string | null;
  tagline?: string | null; logo?: string | null; disclaimerText?: string | null;
  showSlideNumbers?: boolean;
}

// GET /design — deck template, palette, branding & presentation defaults.
design.get('/', async (c) => {
  const t = ctx(c); if (!t) return c.json({ error: 'no_firm' }, 403);
  const data = await withTenant(t, async (tx) => {
    const [fs] = await tx.select().from(schema.firmSettings).where(eq(schema.firmSettings.firmId, t.firmId));
    const [org] = await tx.select({ logo: schema.organization.logo }).from(schema.organization).where(eq(schema.organization.id, t.firmId));
    return {
      templateId: fs?.templateId ?? 'boardroom',
      paletteId: fs?.paletteId ?? 'default',
      accentHex: fs?.accentHex ?? '#15a394',
      tagline: fs?.tagline ?? null,
      disclaimerText: fs?.disclaimerText ?? null,
      showSlideNumbers: fs?.showSlideNumbers ?? true,
      logo: org?.logo ?? null,
      canEdit: t.role === 'firm_admin',
    };
  });
  return c.json(data);
});

// PUT /design — firm_admin only.
design.put('/', async (c) => {
  const t = ctx(c); if (!t) return c.json({ error: 'no_firm' }, 403);
  if (t.role !== 'firm_admin') return c.json({ error: 'forbidden' }, 403);
  const b = (await c.req.json().catch(() => null)) as DesignBody | null;
  if (!b) return c.json({ error: 'invalid body' }, 400);

  const templateId = (TEMPLATES.includes(b.templateId ?? '') ? b.templateId : 'boardroom') as 'boardroom' | 'editorial' | 'monoline' | 'midnight';
  const vals = {
    templateId,
    paletteId: clean(b.paletteId) ?? 'default',
    accentHex: clean(b.accentHex) ?? '#15a394',
    tagline: clean(b.tagline),
    disclaimerText: clean(b.disclaimerText),
    showSlideNumbers: b.showSlideNumbers ?? true,
  };

  // Logo → Blob (outside the tx: it does network I/O). Stores a URL on org.logo.
  const logoUrl = await resolveLogo(t.firmId, b.logo);

  await withTenant(t, async (tx) => {
    await tx.insert(schema.firmSettings)
      .values({ firmId: t.firmId, ...vals })
      .onConflictDoUpdate({ target: schema.firmSettings.firmId, set: { ...vals, updatedAt: new Date() } });
    await tx.update(schema.organization).set({ logo: logoUrl, updatedAt: new Date() }).where(eq(schema.organization.id, t.firmId));
  });
  return c.json({ ok: true });
});