// Typed fetch client against the Hono API (apps/api). Same-origin via the
// Vite dev proxy (/api -> :8787); in prod, VITE_API_URL points at Railway.
const BASE = import.meta.env.VITE_API_URL ?? '';
export async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, { credentials: 'include', ...init });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
