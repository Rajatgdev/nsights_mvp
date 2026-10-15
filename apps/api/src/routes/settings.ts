import { Hono, type Context } from 'hono';
import { eq } from 'drizzle-orm';
import { withTenant, schema } from '@nsights/db';
import type { AppEnv } from '../context';

export const settings = new Hono<AppEnv>();

function ctx(c: Context<AppEnv>) {
  const u = c.get('user');
  const m = c.get('membership');
  return m ? { firmId: m.firmId, userId: u.id, role: m.role } : null;
}

const clean = (v: string | null | undefined) => { const s = (v ?? '').trim(); return s === '' ? null : s; };

interface SettingsBody {
  adviser?: { fullName?: string | null; title?: string | null };
  firm?: { name?: string | null; website?: string | null; email?: string | null; phone?: string | null; address?: string | null };
}

// GET /settings — adviser profile (this user) + firm details.
settings.get('/', async (c) => {
  const t = ctx(c); if (!t) return c.json({ error: 'no_firm' }, 403);
  const data = await withTenant(t, async (tx) => {
    const [u] = await tx.select({ name: schema.user.name, title: schema.user.title }).from(schema.user).where(eq(schema.user.id, t.userId));
    const [org] = await tx.select({ name: schema.organization.name }).from(schema.organization).where(eq(schema.organization.id, t.firmId));
    const [fs] = await tx.select().from(schema.firmSettings).where(eq(schema.firmSettings.firmId, t.firmId));
    return {
      adviser: { fullName: u?.name ?? null, title: u?.title ?? null },
      firm: { name: org?.name ?? null, website: fs?.website ?? null, email: fs?.email ?? null, phone: fs?.phone ?? null, address: fs?.address ?? null },
      canEditFirm: t.role === 'firm_admin',
    };
  });
  return c.json(data);
});

// PUT /settings — adviser profile for the current user (any role);
// firm details only for a firm_admin.
settings.put('/', async (c) => {
  const t = ctx(c); if (!t) return c.json({ error: 'no_firm' }, 403);
  const b = (await c.req.json().catch(() => null)) as SettingsBody | null;
  if (!b) return c.json({ error: 'invalid body' }, 400);

  await withTenant(t, async (tx) => {
    if (b.adviser) {
      await tx.update(schema.user)
        .set({ name: clean(b.adviser.fullName), title: clean(b.adviser.title), updatedAt: new Date() })
        .where(eq(schema.user.id, t.userId));
    }
    if (b.firm && t.role === 'firm_admin') {
      const name = clean(b.firm.name);
      if (name) await tx.update(schema.organization).set({ name, updatedAt: new Date() }).where(eq(schema.organization.id, t.firmId));
      const fv = { website: clean(b.firm.website), email: clean(b.firm.email), phone: clean(b.firm.phone), address: clean(b.firm.address) };
      await tx.insert(schema.firmSettings)
        .values({ firmId: t.firmId, ...fv })
        .onConflictDoUpdate({ target: schema.firmSettings.firmId, set: { ...fv, updatedAt: new Date() } });
    }
  });
  return c.json({ ok: true });
});