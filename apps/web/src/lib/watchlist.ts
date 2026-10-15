// Fund watchlist — the funds the adviser chooses to keep an eye on, shown on
// the Dashboard with live metrics. Persisted per browser (localStorage).
const KEY = 'nsights.watchlist.v1';

export function getWatchlist(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]; } catch { return []; }
}
function save(ids: string[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage unavailable — ignore */ }
}
export function addToWatchlist(id: string): string[] {
  const ids = getWatchlist();
  if (!ids.includes(id)) ids.push(id);
  save(ids); return ids;
}
export function removeFromWatchlist(id: string): string[] {
  const ids = getWatchlist().filter((x) => x !== id);
  save(ids); return ids;
}