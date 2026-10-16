// Fund watchlist — the funds the adviser keeps an eye on, shown on the
// Dashboard. Server-backed (Neon) so it follows the user across devices.
// Each call returns the full current fund-id list. Backed by
// apps/api/src/routes/watchlist.ts.
import { api } from './api';

export async function getWatchlist(): Promise<string[]> {
  try { return (await api('/watchlist')).fundIds as string[]; } catch { return []; }
}
export async function addToWatchlist(fundId: string): Promise<string[]> {
  return (await api('/watchlist', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fundId }),
  })).fundIds as string[];
}
export async function removeFromWatchlist(fundId: string): Promise<string[]> {
  return (await api(`/watchlist/${encodeURIComponent(fundId)}`, { method: 'DELETE' })).fundIds as string[];
}