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

// Histogram buckets (§6.5) — port from stable calc.
export const MONTHLY_BUCKETS = [-4, -2, 0, 2, 4] as const;
export const QUARTERLY_BUCKETS = [-8, -4, 0, 4, 8] as const;

// Indicative risk-class vol bands (§6.6).
export const RISK_VOL_BANDS = [0.5, 2, 5, 10, 15, 25] as const;
