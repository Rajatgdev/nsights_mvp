// Deck design system — one token set drives the cover, the chart palette and
// the PPTX export, so everything a firm produces looks consistent.
// Mirrors the standalone prototype's DECK_THEMES / DECK_PALETTES.

export interface DeckTemplate {
    id: string; name: string; note: string;
    deep: string;        // solid cover background (hex) — used in preview and PPTX
    accent: string;      // default accent
    chart: string[];     // chart series colour order
    caps: boolean;       // uppercase slide titles
    serif: boolean;      // serif display font
  }
  
  export const DECK_TEMPLATES: DeckTemplate[] = [
    { id: 'boardroom', name: 'Boardroom', note: 'Navy cover, teal accent', deep: '#0d2b3e', accent: '#15a394', caps: false, serif: false,
      chart: ['#15a394', '#2563c9', '#e6800a', '#8453d6', '#d8556a', '#0d9bbf', '#7a8794', '#b4691f'] },
    { id: 'editorial', name: 'Editorial', note: 'Warm dark, serif titles', deep: '#241f1a', accent: '#9c5a2c', caps: true, serif: true,
      chart: ['#1f4e79', '#a9552a', '#2f7d5b', '#7a5195', '#c0475d', '#3d7f96', '#8a7a5c', '#b07a1f'] },
    { id: 'monoline', name: 'Monoline', note: 'Charcoal, hairline rules', deep: '#111827', accent: '#111827', caps: true, serif: false,
      chart: ['#111827', '#2563c9', '#0d9bbf', '#8453d6', '#b4691f', '#179b78', '#d8556a', '#6b7280'] },
    { id: 'midnight', name: 'Midnight', note: 'Dark slides, bright data', deep: '#080d16', accent: '#35c2a8', caps: false, serif: false,
      chart: ['#35c2a8', '#5c9bf5', '#f2b134', '#b28cf0', '#f4788f', '#4ec9e8', '#9fb0c4', '#e0913f'] },
  ];
  
  export interface DeckPalette { id: string; name: string; accent: string | null; deep: string | null; chart: string[] | null; }
  
  export const DECK_PALETTES: DeckPalette[] = [
    { id: 'default', name: 'Template default', accent: null, deep: null, chart: null },
    { id: 'harbour', name: 'Harbour Teal', accent: '#15a394', deep: '#0d2b3e', chart: ['#15a394', '#2563c9', '#e6800a', '#8453d6', '#d8556a', '#0d9bbf', '#7a8794', '#b4691f'] },
    { id: 'liffey', name: 'Dublin Slate', accent: '#3f6d8e', deep: '#1c2b36', chart: ['#3f6d8e', '#2f8f7f', '#c9812f', '#7a6ba8', '#c25b6a', '#4f8fa8', '#8a94a0', '#a3762a'] },
    { id: 'forest', name: 'Forest & Cream', accent: '#2f6b4a', deep: '#1d2b22', chart: ['#2f6b4a', '#8a6b2f', '#5b7f9e', '#a8553f', '#6b5b8f', '#3f8f7a', '#8f8a6b', '#b08a3f'] },
    { id: 'oxblood', name: 'Oxblood Stone', accent: '#8c2f39', deep: '#2a1f22', chart: ['#8c2f39', '#3f5f7a', '#a8762f', '#5b6b4a', '#6b4a7a', '#2f7f7a', '#8a7a6b', '#b0553f'] },
    { id: 'copper', name: 'Copper Charcoal', accent: '#b5762f', deep: '#23262a', chart: ['#b5762f', '#2f6f8f', '#4f8f6b', '#8a5b9e', '#c2564f', '#3f8fa8', '#8a8f96', '#7a6b3f'] },
    { id: 'indigo', name: 'Nightfall Indigo', accent: '#5c6fd8', deep: '#171b2e', chart: ['#5c6fd8', '#2fa08f', '#e0913f', '#a86bd8', '#e0607a', '#3fb0d8', '#9aa3b8', '#c2833f'] },
    { id: 'kaben', name: 'Markets Navy', accent: '#4472c4', deep: '#153c50', chart: ['#4472c4', '#ed7d31', '#70ad47', '#ffc000', '#5b9bd5', '#a5a5a5', '#264478', '#9e480e'] },
  ];
  
  export interface ResolvedTheme { templateId: string; templateName: string; accent: string; deep: string; chart: string[]; caps: boolean; serif: boolean; }
  
  export function templateById(id: string): DeckTemplate { return DECK_TEMPLATES.find((t) => t.id === id) ?? DECK_TEMPLATES[0]; }
  export function paletteById(id: string): DeckPalette { return DECK_PALETTES.find((p) => p.id === id) ?? DECK_PALETTES[0]; }
  
  // accentHex (the firm's chosen accent) always wins; palette/template supply deep + chart.
  export function resolveTheme(templateId: string, paletteId: string, accentHex?: string | null): ResolvedTheme {
    const t = templateById(templateId);
    const p = paletteById(paletteId);
    const accent = (accentHex && accentHex.trim()) ? accentHex.trim() : (p.accent ?? t.accent);
    return { templateId: t.id, templateName: t.name, accent, deep: p.deep ?? t.deep, chart: p.chart ?? t.chart, caps: t.caps, serif: t.serif };
  }