// Firm-admin seat management (firm-scoped). Backed by apps/api/src/routes/firm.ts.
import { api } from './api';

export interface TeamMember {
  userId: string; email: string; name: string; role: string;
  canDownload: boolean; canEditHousePortfolios: boolean;
}
export interface TeamInvite { id: string; email: string; role: string; expiresAt: string | null; }
export interface TeamData {
  members: TeamMember[]; invites: TeamInvite[]; seatLimit: number; seatsUsed: number;
}

export async function getTeam(): Promise<TeamData> {
  return api('/firm/members');
}
export async function inviteSeat(email: string, role: 'adviser' | 'assistant'): Promise<{ ok: true; link: string }> {
  return api('/firm/invites', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, role }),
  });
}
export async function revokeInvite(id: string): Promise<{ ok: true }> {
  return api(`/firm/invites/${id}`, { method: 'DELETE' });
}
export async function updateMember(userId: string, body: {
  role?: 'firm_admin' | 'adviser' | 'assistant'; canDownload?: boolean; canEditHousePortfolios?: boolean;
}): Promise<{ ok: true }> {
  return api(`/firm/members/${userId}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}
export async function removeMember(userId: string): Promise<{ ok: true }> {
  return api(`/firm/members/${userId}`, { method: 'DELETE' });
}