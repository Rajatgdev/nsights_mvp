import { Hono, type Context } from 'hono';
import { eq } from 'drizzle-orm';
import { withTenant, schema } from '@nsights/db';
import type { AppEnv } from '../context';

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

  await withTenant(t, async (tx) => {
    await tx.insert(schema.firmSettings)
      .values({ firmId: t.firmId, ...vals })
      .onConflictDoUpdate({ target: schema.firmSettings.firmId, set: { ...vals, updatedAt: new Date() } });
    // logo lives on the organization row (data URL for the MVP).
    await tx.update(schema.organization).set({ logo: clean(b.logo), updatedAt: new Date() }).where(eq(schema.organization.id, t.firmId));
  });
  return c.json({ ok: true });
});