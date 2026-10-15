import {
    blend, computeFundMetrics, riskClassFromVol, volatility,
    type Leg, type Rebalancing, type DatedSeries,
  } from '@nsights/calc';
  import { profile } from './rules.js';
  import type { HoldingInput, PortfolioAnalysis, PortfolioWarning } from './types.js';
  
  export interface AnalyseInput { holdings: HoldingInput[]; dates: string[]; rebalancing?: Rebalancing; }
  
  function blendStartIndex(holdings: HoldingInput[]): number {
    const firsts = holdings.map((h) => (h.series ?? []).findIndex((v) => v != null));
    return firsts.length ? Math.max(...firsts) : -1;
  }
  
  export function analyse(input: AnalyseInput): PortfolioAnalysis {
    const { holdings, dates, rebalancing = 'monthly' } = input;
    const volByFund = new Map<string, number | null>();
    for (const h of holdings) volByFund.set(h.fundId, volatility(h.series ?? [], 60));
    const prof = profile(holdings, volByFund);
  
    const legs: Leg[] = holdings.map((h) => ({ series: h.series ?? [], weightBp: h.weightBp }));
    let blendSeries: (number | null)[] = [];
    let metrics: Record<string, unknown> = {};
    let indicativeRiskClass: number | null = null;
    try {
      blendSeries = blend(legs, rebalancing);
      const ds: DatedSeries = { dates, series: blendSeries };
      metrics = computeFundMetrics(ds) as unknown as Record<string, unknown>;
      const vol5 = volatility(blendSeries, 60) ?? volatility(blendSeries);
      indicativeRiskClass = vol5 != null ? riskClassFromVol(vol5 * 100) : null;
    } catch { /* weights invalid — profile still returned */ }
  
    let historyLimitedBy: PortfolioAnalysis['historyLimitedBy'] = null;
    const startIdx = blendStartIndex(holdings);
    if (startIdx >= 0) {
      const limiter = holdings.find((h) => (h.series ?? []).findIndex((v) => v != null) === startIdx);
      if (limiter) historyLimitedBy = { fundId: limiter.fundId, name: limiter.name, startDate: dates[startIdx] ?? null };
    }
    return { ...prof, blendSeries, metrics, indicativeRiskClass, historyLimitedBy };
  }
  
  export type { PortfolioWarning };