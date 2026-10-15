// Core calc primitives (spec §6.1). Pure, no I/O. Sample stdev (N-1) by default.
import { VOL_STDEV_BASIS, SHARPE_RISK_FREE_RATE } from '@nsights/shared';

export type Series = (number | null)[];

export function firstIndex(series: Series): number {
  return series.findIndex((v) => v != null);
}

export function lastIndex(series: Series): number {
  for (let i = series.length - 1; i >= 0; i--) if (series[i] != null) return i;
  return -1;
}

export function monthlyReturns(series: Series): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    const cur = series[i];
    out.push(prev != null && cur != null && prev !== 0 ? cur / prev - 1 : null);
  }
  return out;
}

export function totalReturn(series: Series, m: number): number | null {
  const n = lastIndex(series);
  const f = firstIndex(series);
  if (n < 0 || n - m < f || n - m < 0) return null;
  const pn = series[n];
  const pStart = series[n - m];
  if (pn == null || pStart == null || pStart === 0) return null;
  return pn / pStart - 1;
}

export function annualised(series: Series, m: number): number | null {
  const n = lastIndex(series);
  const f = firstIndex(series);
  if (n < 0 || n - m < f || n - m < 0) return null;
  const pn = series[n];
  const pStart = series[n - m];
  if (pn == null || pStart == null || pStart === 0) return null;
  return Math.pow(pn / pStart, 12 / m) - 1;
}

export function sinceLaunchAnnualised(series: Series): number | null {
  const n = lastIndex(series);
  const f = firstIndex(series);
  if (n < 0 || f < 0 || n === f) return null;
  const months = n - f;
  const pn = series[n];
  const pf = series[f];
  if (pn == null || pf == null || pf === 0) return null;
  if (months < 12) return pn / pf - 1;
  return Math.pow(pn / pf, 12 / months) - 1;
}

export function stdev(values: number[], basis = VOL_STDEV_BASIS): number {
  const n = values.length;
  if (n === 0) return NaN;
  const denom = basis === 'sample' ? n - 1 : n;
  if (denom <= 0) return NaN;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / denom;
  return Math.sqrt(variance);
}

export function volatility(series: Series, windowMonths?: number): number | null {
  const rets = monthlyReturns(series).filter((r): r is number => r != null);
  const slice = windowMonths != null ? rets.slice(-windowMonths) : rets;
  if (slice.length < 2) return null;
  return stdev(slice) * Math.sqrt(12);
}

export function maxDrawdown(series: Series, windowMonths?: number): number | null {
  const prices = series.filter((p): p is number => p != null);
  const slice = windowMonths != null ? prices.slice(-(windowMonths + 1)) : prices;
  if (slice.length < 2) return null;
  let peak = slice[0]!;
  let mdd = 0;
  for (const p of slice) {
    if (p > peak) peak = p;
    const dd = p / peak - 1;
    if (dd < mdd) mdd = dd;
  }
  return mdd;
}

export function sharpe(series: Series, windowMonths: number, rf = SHARPE_RISK_FREE_RATE): number | null {
  const ann = annualised(series, windowMonths);
  const vol = volatility(series, windowMonths);
  if (ann == null || vol == null || vol === 0) return null;
  return (ann - rf) / vol;
}

export function rebase(series: Series, base = 10_000): Series {
  const f = firstIndex(series);
  if (f < 0) return series.map(() => null);
  const p0 = series[f]!;
  return series.map((p) => (p == null ? null : (p / p0) * base));
}

export function rollingCumulative(series: Series, w: number): (number | null)[] {
  return series.map((p, t) => {
    const prev = series[t - w];
    if (t - w < 0 || p == null || prev == null || prev === 0) return null;
    return p / prev - 1;
  });
}

export function rollingVolatility(series: Series, w = 12): (number | null)[] {
  const rets = monthlyReturns(series);
  const out: (number | null)[] = new Array(series.length).fill(null);
  for (let t = w; t < series.length; t++) {
    const window = rets.slice(t - w, t);
    if (window.some((r) => r == null)) { out[t] = null; continue; }
    out[t] = stdev(window as number[]) * Math.sqrt(12);
  }
  return out;
}