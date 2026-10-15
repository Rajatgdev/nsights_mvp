// Stress-event drawdown (spec §6.4).
import type { DatedSeries } from './calendar.js';

export interface StressResult {
  id: string;
  label: string;
  drawdown: number | null;
  troughDate: string | null;
  recoveryMonthsFromStart: number | null;
  recoveryMonthsFromTrough: number | null;
}

export interface StressEventDef { id: string; label: string; start: string; end: string; }

function indexOnOrAfter(dates: string[], iso: string): number {
  for (let i = 0; i < dates.length; i++) if (dates[i]! >= iso) return i;
  return -1;
}
function indexOnOrBefore(dates: string[], iso: string): number {
  for (let i = dates.length - 1; i >= 0; i--) if (dates[i]! <= iso) return i;
  return -1;
}

export function stressDrawdown(ds: DatedSeries, ev: StressEventDef): StressResult {
  const startIdx = indexOnOrAfter(ds.dates, ev.start);
  const endIdx = indexOnOrBefore(ds.dates, ev.end);
  const base: StressResult = {
    id: ev.id, label: ev.label, drawdown: null, troughDate: null,
    recoveryMonthsFromStart: null, recoveryMonthsFromTrough: null,
  };
  if (startIdx < 0 || endIdx < 0 || endIdx < startIdx) return base;
  const startPrice = ds.series[startIdx];
  if (startPrice == null) return base;

  let peak = startPrice;
  let worst = 0;
  let troughIdx = startIdx;
  for (let t = startIdx; t <= endIdx; t++) {
    const p = ds.series[t];
    if (p == null) continue;
    if (p > peak) peak = p;
    const dd = p / peak - 1;
    if (dd < worst) { worst = dd; troughIdx = t; }
  }

  let recoveryIdx: number | null = null;
  for (let t = troughIdx + 1; t < ds.series.length; t++) {
    const p = ds.series[t];
    if (p != null && p >= startPrice) { recoveryIdx = t; break; }
  }

  return {
    id: ev.id, label: ev.label, drawdown: worst,
    troughDate: ds.dates[troughIdx] ?? null,
    recoveryMonthsFromStart: recoveryIdx == null ? null : recoveryIdx - startIdx,
    recoveryMonthsFromTrough: recoveryIdx == null ? null : recoveryIdx - troughIdx,
  };
}