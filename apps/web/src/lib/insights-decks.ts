// Insights decks (Kaben's platform-global PPT/PDF library). GET for everyone;
// upload/delete are platform_admin only (API enforces it). Backed by
// apps/api/src/routes/insights.ts.
import { api } from './api';

export interface Deck {
  id: string; title: string; filename: string | null; url: string;
  contentType: string | null; sizeBytes: number | null; createdAt: string;
}

export async function listDecks(): Promise<Deck[]> {
  return (await api('/insights/decks')).decks;
}

export interface AuthorPage { id: string; url: string; title: string | null; index: number | null; }
export interface AuthorDeck { id: string; title: string; pages: AuthorPage[]; }
export async function listAuthorSlides(): Promise<AuthorDeck[]> {
  return (await api('/insights/slides')).decks;
}
export async function uploadDeck(file: File, title: string): Promise<{ deck: Deck }> {
  const fd = new FormData();
  fd.append('title', title);
  fd.append('file', file);
  return api('/insights/decks', { method: 'POST', body: fd }); // no content-type → browser sets multipart boundary
}
export async function deleteDeck(id: string): Promise<{ ok: true }> {
  return api(`/insights/decks/${id}`, { method: 'DELETE' });
}

export function prettySize(bytes: number | null): string {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}