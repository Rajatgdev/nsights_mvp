import { api } from './api';

export interface Me {
  user: { id: string; email: string; role: string };
  membership: null | {
    firmId: string; role: string; canEditHousePortfolios: boolean;
    canDownload: boolean; firmStatus: string;
  };
}

export async function me(): Promise<Me | null> {
  try { return (await api('/me')) as Me; } catch { return null; }
}

export async function signIn(email: string, password: string) {
  return api('/auth/sign-in/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function signOut() {
  return api('/auth/sign-out', { method: 'POST' });
}