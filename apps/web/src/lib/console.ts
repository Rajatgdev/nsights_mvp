// Platform-admin (Kaben) console API. Headcount + roles across ALL firms —
// never firm content. Backed by apps/api/src/routes/admin.ts.
import { api } from './api';

export interface FirmRow {
  id: string; name: string; slug: string; status: string;
  seatLimit: number; members: number; admins: number;
}
export interface FirmMember {
  userId: string; email: string; name: string; role: string; canDownload: boolean;
}
export interface FirmInviteRow {
  id: string; email: string; role: string; expiresAt: string | null;
}
export interface FirmDetail { members: FirmMember[]; invites: FirmInviteRow[]; }

export async function listFirms(): Promise<FirmRow[]> {
  return (await api('/admin/firms')).firms;
}
export async function getFirm(id: string): Promise<FirmDetail> {
  return api(`/admin/firms/${id}`);
}
export async function createFirm(body: {
  name: string; slug: string; adminEmail: string; adminName?: string; seatLimit?: number;
}): Promise<{ firm: { id: string; name: string; slug: string }; inviteLink: string }> {
  return api('/admin/firms', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}
export async function updateFirm(id: string, body: { seatLimit?: number; status?: 'active' | 'paused' }): Promise<{ ok: true }> {
  return api(`/admin/firms/${id}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}