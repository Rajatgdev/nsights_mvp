// Recent presentations — client-side store of decks the user has exported.
// Metadata in localStorage; the actual .pptx blob in IndexedDB so it can be
// re-downloaded after refresh. (Server persistence is still a stub — deferred.)
export interface RecentPresentation { id: string; name: string; slideCount: number; date: string; }

const KEY = 'nsights.presentations.v1';
const DB = 'nsights', STORE = 'decks';

function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export function listRecentPresentations(): RecentPresentation[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as RecentPresentation[]; } catch { return []; }
}

// Returns the new record's id so the caller can store the blob under it.
export function recordPresentation(name: string, slideCount: number): string {
  const id = crypto.randomUUID();
  try {
    const list = listRecentPresentations();
    list.unshift({ id, name, slideCount, date: new Date().toISOString() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20)));
  } catch { /* storage unavailable — ignore */ }
  return id;
}

export async function saveDeckBlob(id: string, blob: Blob): Promise<void> {
  const db = await idb();
  await new Promise<void>((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(blob, id); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  db.close();
}

export async function getDeckBlob(id: string): Promise<Blob | null> {
  try {
    const db = await idb();
    const blob = await new Promise<Blob | null>((res, rej) => { const tx = db.transaction(STORE, 'readonly'); const g = tx.objectStore(STORE).get(id); g.onsuccess = () => res((g.result as Blob) ?? null); g.onerror = () => rej(g.error); });
    db.close(); return blob;
  } catch { return null; }
}

export async function deleteDeck(id: string): Promise<void> {
  try { localStorage.setItem(KEY, JSON.stringify(listRecentPresentations().filter((p) => p.id !== id))); } catch { /* ignore */ }
  try { const db = await idb(); await new Promise<void>((res) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(id); tx.oncomplete = () => res(); tx.onerror = () => res(); }); db.close(); } catch { /* ignore */ }
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}