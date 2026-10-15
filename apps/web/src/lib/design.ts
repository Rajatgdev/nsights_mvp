import { api } from './api';

export interface DesignConfig {
  templateId: string;
  paletteId: string;
  accentHex: string;
  tagline: string | null;
  logo: string | null;        // data URL
  disclaimerText: string | null;
  showSlideNumbers: boolean;
  canEdit: boolean;
}

export async function getDesign(): Promise<DesignConfig> {
  return (await api('/design')) as DesignConfig;
}

export async function saveDesign(body: Omit<DesignConfig, 'canEdit'>): Promise<void> {
  await api('/design', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}