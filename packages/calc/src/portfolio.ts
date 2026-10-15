// Portfolio blending & indicative risk class (spec §6.6). Weights in basis points.
import { PORTFOLIO_WEIGHT_TOTAL_BP, RISK_VOL_BANDS } from '@nsights/shared';
import type { Series } from './primitives.js';

export interface Leg { series: Series; weightBp: number; }
export type Rebalancing = 'monthly' | 'buy-and-hold';

function blendStart(legs: Leg[]): number {
  return Math.max(...legs.map((l) => l.series.findIndex((v) => v != null)));
}

export function assertWeights(legs: Leg[]): void {
  const total = legs.reduce((a, l) => a + l.weightBp, 0);
  if (total !== PORTFOLIO_WEIGHT_TOTAL_BP) {
    throw new Error(`Weights must sum to ${PORTFOLIO_WEIGHT_TOTAL_BP} bp, got ${total}`);
  }
}

export function blend(legs: Leg[], rebalancing: Rebalancing = 'monthly'): Series {
  assertWeights(legs);
  const len = legs[0]?.series.length ?? 0;
  const start = blendStart(legs);
  const out: Series = new Array(len).fill(null);
  if (start < 0 || start >= len) return out;
  const w = legs.map((l) => l.weightBp / PORTFOLIO_WEIGHT_TOTAL_BP);

  if (rebalancing === 'buy-and-hold') {
    const pStart = legs.map((l) => l.series[start]!);
    for (let t = start; t < len; t++) {
      let v = 0; let ok = true;
      for (let i = 0; i < legs.length; i++) {
        const p = legs[i]!.series[t];
        if (p == null) { ok = false; break; }
        v += w[i]! * (p / pStart[i]!);
      }
      out[t] = ok ? v * 10_000 : null;
    }
    return out;
  }

  let v = 10_000;
  out[start] = v;
  for (let t = start + 1; t < len; t++) {
    let portRet = 0; let ok = true;
    for (let i = 0; i < legs.length; i++) {
      const cur = legs[i]!.series[t];
      const prev = legs[i]!.series[t - 1];
      if (cur == null || prev == null || prev === 0) { ok = false; break; }
      portRet += w[i]! * (cur / prev - 1);
    }
    if (!ok) { out[t] = null; continue; }
    v = v * (1 + portRet);
    out[t] = v;
  }
  return out;
}

export function riskClassFromVol(annVolPct: number): number {
  for (const band of RISK_VOL_BANDS) if (annVolPct < band.maxVolPct) return band.class;
  return 7;
}

export function averageFundRisk(holdings: { weightBp: number; riskRating: number }[]): number {
  const total = holdings.reduce((a, h) => a + h.weightBp, 0);
  if (total === 0) return 0;
  const w = holdings.reduce((a, h) => a + (h.weightBp / total) * h.riskRating, 0);
  return Math.round(w * 10) / 10;
}