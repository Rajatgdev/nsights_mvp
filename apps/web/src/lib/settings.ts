import { api } from './api';

export interface SettingsData {
  adviser: { fullName: string | null; title: string | null };
  firm: { name: string | null; website: string | null; email: string | null; phone: string | null; address: string | null };
  canEditFirm: boolean;
}

export async function getSettings(): Promise<SettingsData> {
  return (await api('/settings')) as SettingsData;
}

export async function saveSettings(body: { adviser: SettingsData['adviser']; firm: SettingsData['firm'] }): Promise<void> {
  await api('/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}