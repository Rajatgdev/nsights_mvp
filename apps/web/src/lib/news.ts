// Dashboard news. GET for everyone; create/edit/delete are platform_admin only
// (the API enforces it). Backed by apps/api/src/routes/news.ts.
import { api } from './api';

export interface NewsItem {
  id: string; title: string; source: string; body: string;
  url: string | null; publishedAt: string;
}

export async function listNews(): Promise<NewsItem[]> {
  return (await api('/news')).news;
}
export async function createNews(b: {
  title: string; source: string; body: string; url?: string; publishedAt?: string;
}): Promise<NewsItem> {
  return (await api('/news', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).news;
}
export async function updateNews(id: string, b: {
  title?: string; source?: string; body?: string; url?: string; publishedAt?: string;
}): Promise<NewsItem> {
  return (await api(`/news/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).news;
}
export async function deleteNews(id: string): Promise<{ ok: true }> {
  return api(`/news/${id}`, { method: 'DELETE' });
}

// Deterministic avatar initials + colour from a source name (no stored colour).
const PALETTE = ['#1f5c8a', '#1f64c4', '#2e8b57', '#16a394', '#2a4a73', '#8a5a1f', '#7a3e8a', '#b62d2d'];
export function sourceInitial(source: string): string {
  const words = source.trim().split(/\s+/);
  return (words.length >= 2 ? words[0][0] + words[1][0] : source.slice(0, 2)).toUpperCase();
}
export function sourceColor(source: string): string {
  let h = 0;
  for (let i = 0; i < source.length; i++) h = (h * 31 + source.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}