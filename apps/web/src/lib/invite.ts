// PUBLIC invite-accept flow (no session yet). Backed by apps/api/src/routes/
// invites.ts. Raw fetch (not the throwing `api` helper) so the accept page can
// show the exact error to a logged-out invitee.
const BASE = import.meta.env.VITE_API_URL ?? '';

export interface InviteInfo { firmName: string; email: string; role: string; valid: boolean; }

export async function getInvite(token: string): Promise<InviteInfo | null> {
  const res = await fetch(`${BASE}/api/invites/${token}`, { credentials: 'include' });
  if (!res.ok) return null;
  return res.json();
}

export async function acceptInvite(
  token: string, password: string, name?: string,
): Promise<{ ok: true; firmId: string; email: string } | { ok: false; error: string; message?: string }> {
  const res = await fetch(`${BASE}/api/invites/${token}/accept`, {
    method: 'POST', credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password, name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error ?? 'error', message: data.message };
  return { ok: true, firmId: data.firmId, email: data.email };
}