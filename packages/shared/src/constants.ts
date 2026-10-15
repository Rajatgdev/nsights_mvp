// Replicate from stable repo: packages/shared/src/constants.ts
// Providers + brand colours (prototype values).
export const PROVIDER_COLOURS: Record<string, string> = {
  Zurich: '#1f64c4',
  'New Ireland': '#2e8b57',
  'Irish Life': '#16a394',
  Aviva: '#caa023',
  'Standard Life': '#2a4a73',
  'Royal London': '#6a4fb3',
};

export const ASSET_CLASSES = ['Equity', 'Multi-Asset', 'Bond', 'Property', 'Cash'] as const;

// Roles / tenancy
export const PLATFORM_ROLE = 'platform_admin' as const;
export const FIRM_ROLES = ['firm_admin', 'adviser', 'assistant'] as const;
export type FirmRole = (typeof FIRM_ROLES)[number];
export const MAX_FIRM_ADMINS = 2;

export const FIRM_STATUSES = [
  'onboarding', 'trial', 'active', 'past_due', 'paused', 'cancelled',
] as const;
export type FirmStatus = (typeof FIRM_STATUSES)[number];

// Histogram buckets (§6.5) — port from stable calc.
// ── Calc constants (spec §6) ─────────────────────────────────
export const VOL_STDEV_BASIS: 'sample' | 'population' = 'sample';
export const SHARPE_RISK_FREE_RATE = 0;
export const ANNUALISED_WINDOWS_MONTHS = [36, 60, 84, 120] as const;

export const HIST_MONTHLY_BUCKETS = [
  { label: '< -4%', min: -Infinity, max: -4 },
  { label: '-4 to -2%', min: -4, max: -2 },
  { label: '-2 to 0%', min: -2, max: 0 },
  { label: '0 to 2%', min: 0, max: 2 },
  { label: '2 to 4%', min: 2, max: 4 },
  { label: '>= 4%', min: 4, max: Infinity },
] as const;

export const HIST_QUARTERLY_BUCKETS = [
  { label: '< -8%', min: -Infinity, max: -8 },
  { label: '-8 to -4%', min: -8, max: -4 },
  { label: '-4 to 0%', min: -4, max: 0 },
  { label: '0 to 4%', min: 0, max: 4 },
  { label: '4 to 8%', min: 4, max: 8 },
  { label: '>= 8%', min: 8, max: Infinity },
] as const;

export const RISK_VOL_BANDS: { class: number; maxVolPct: number }[] = [
  { class: 1, maxVolPct: 0.5 },
  { class: 2, maxVolPct: 2 },
  { class: 3, maxVolPct: 5 },
  { class: 4, maxVolPct: 10 },
  { class: 5, maxVolPct: 15 },
  { class: 6, maxVolPct: 25 },
  { class: 7, maxVolPct: Infinity },
];

export const PORTFOLIO_WEIGHT_TOTAL_BP = 10_000;

export const STRESS_EVENTS = [
  { id: 'tradewar', label: 'Trade-war sell-off 2018', start: '2018-08-31', end: '2018-12-31' },
  { id: 'covid', label: 'Covid crash 2020', start: '2020-01-31', end: '2020-03-31' },
  { id: 'inflation', label: 'Inflation & rate hikes 2022', start: '2021-12-31', end: '2022-10-31' },
  { id: 'tariff', label: 'Tariff shock 2025', start: '2025-01-31', end: '2025-04-30' },
] as const;
