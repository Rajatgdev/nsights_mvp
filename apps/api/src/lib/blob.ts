// Object storage (Vercel Blob). The API holds BLOB_READ_WRITE_TOKEN and does
// all uploads/deletes. Phase 0 uses a PUBLIC store with unguessable
// random-suffix keys (store blob.url, never reconstruct the path). Switching
// to a private store + signed URLs (issueSignedToken / presignUrl) is a
// hardening item for the audit phase — isolated to this module.
import { put, del } from '@vercel/blob';

const ACCESS: 'public' | 'private' = process.env.BLOB_ACCESS === 'private' ? 'private' : 'public';

export interface PutResult { url: string; pathname: string; }

export async function putObject(key: string, data: Buffer, contentType?: string): Promise<PutResult> {
  const r = await put(key, data, { access: ACCESS, contentType, addRandomSuffix: true });
  return { url: r.url, pathname: r.pathname };
}

// Accepts the stored url (or pathname). Never throws on a missing object.
export async function deleteObject(urlOrKey: string): Promise<void> {
  try { await del(urlOrKey); } catch { /* already gone — ignore */ }
}