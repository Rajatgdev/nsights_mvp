// Return-distribution histograms (spec §6.5). Returns as PERCENT. Zeros excluded from %positive.
import { HIST_MONTHLY_BUCKETS, HIST_QUARTERLY_BUCKETS } from '@nsights/shared';

interface Bucket { label: string; min: number; max: number; }

function bucketCounts(returnsPct: number[], buckets: readonly Bucket[]) {
  const counts = buckets.map((b) => ({ label: b.label, count: 0 }));
  for (const r of returnsPct) {
    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i]!;
      const isLast = i === buckets.length - 1;
      if (r >= b.min && (isLast ? true : r < b.max)) { counts[i]!.count++; break; }
    }
  }
  return counts;
}

export function monthlyHistogram(monthlyReturns: number[]) {
  return bucketCounts(monthlyReturns.map((r) => r * 100), HIST_MONTHLY_BUCKETS);
}

export function quarterlyHistogram(quarterlyReturns: number[]) {
  return bucketCounts(quarterlyReturns.map((r) => r * 100), HIST_QUARTERLY_BUCKETS);
}

export function percentPositive(returns: number[]): number | null {
  const nonZero = returns.filter((r) => r !== 0);
  if (nonZero.length === 0) return null;
  return nonZero.filter((r) => r > 0).length / nonZero.length;
}