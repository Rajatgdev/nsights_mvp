import { createMiddleware } from 'hono/factory';
import { sql } from 'drizzle-orm';
import { db } from '@nsights/db';
import type { AppEnv, FirmMembership, SessionUser } from '../context';
import { auth } from '../auth';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthenticated' }, 401);

  c.set('user', session.user);
  if (session.membership) {
    c.set('membership', session.membership);
    const writable = ['onboarding', 'trial', 'active', 'past_due'];
    if (WRITE_METHODS.has(c.req.method) && !writable.includes(session.membership.firmStatus)) {
      return c.json({ error: 'firm_not_writable', status: session.membership.firmStatus }, 402);
    }
  }
  await next();
});

interface LoadedSession { user: SessionUser; membership?: FirmMembership; }

async function getSession(req: Request): Promise<LoadedSession | null> {
  const result = await auth.api.getSession({ headers: req.headers });
  if (!result?.user) return null;

  const user: SessionUser = {
    id: result.user.id,
    email: result.user.email,
    role: (result.user as { role?: string }).role ?? 'user',
  };
  const activeOrgId = (result.session as { activeOrganizationId?: string }).activeOrganizationId;

  // Bootstrap: read the user's memberships before firm context exists via the
  // SECURITY DEFINER function (RLS on `member` would otherwise hide them).
  const q = await db.execute(
    sql`select firm_id, role, can_edit_house_portfolios, can_download, firm_status
        from app_user_memberships(${user.id})`,
  );
  const rows = q.rows as {
    firm_id: string; role: FirmMembership['role'];
    can_edit_house_portfolios: boolean; can_download: boolean;
    firm_status: FirmMembership['firmStatus'];
  }[];

  const picked = (activeOrgId && rows.find((r) => r.firm_id === activeOrgId)) || rows[0];
  const membership: FirmMembership | undefined = picked
    ? {
        firmId: picked.firm_id,
        role: picked.role,
        canEditHousePortfolios: picked.can_edit_house_portfolios,
        canDownload: picked.can_download,
        firmStatus: picked.firm_status,
      }
    : undefined;

  return { user, membership };
}