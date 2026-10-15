import { z } from 'zod';

// The monthly dataset blob — mirrors dataset-default.json shape.
export const FundSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  cls: z.string(),            // asset class
  risk: z.number().int().min(1).max(7),
  category: z.string(),
  amc: z.number(),
  prices: z.array(z.number().nullable()),  // aligned to dataset.dates
});

export const DatasetSchema = z.object({
  source: z.string(),
  updated: z.string(),          // YYYY-MM-DD (last price month)
  dates: z.array(z.string()),   // month-end index
  funds: z.array(FundSchema),
});

export type Fund = z.infer<typeof FundSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;

export type Role = 'platform_admin' | 'firm_admin' | 'assistant';
