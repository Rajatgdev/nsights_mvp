// Recent presentations — the .pptx decks the user has exported. Server-backed
// (Neon + Vercel Blob) so the list and re-download follow the user across
// devices. Backed by apps/api/src/routes/presentations.ts.
import { api } from './api';

export interface RecentPresentation {
  id: string; name: string; slideCount: number; date: string; url: string;
}

export async function listRecentPresentations(): Promise<RecentPresentation[]> {
  try { return (await api('/presentations')).presentations as RecentPresentation[]; } catch { return []; }
}

// Upload a freshly generated deck so it's saved server-side. Called from export.
export async function uploadDeck(blob: Blob, name: string, slideCount: number): Promise<void> {
  const fd = new FormData();
  fd.append('name', name);
  fd.append('slideCount', String(slideCount));
  fd.append('file', blob, `${name}.pptx`);
  await api('/presentations', { method: 'POST', body: fd });
}

export async function deleteDeck(id: string): Promise<void> {
  try { await api(`/presentations/${id}`, { method: 'DELETE' }); } catch { /* ignore */ }
}

// Trigger a browser download of a blob (used for the immediate post-export save).
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}