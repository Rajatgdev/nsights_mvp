import {
    computeFundMetrics, rebase, rollingCumulative, rollingVolatility, firstIndex,
  } from '@nsights/calc';
  import { PROVIDER_COLOURS } from '@nsights/shared';
  
  export interface FundSeries {
    id: string; name: string; provider: string; risk: number; amc: number;
    prices: (number | null)[];
  }
  export interface ChartSpec {
    key: string; title: string; kind: 'echarts' | 'table';
    option?: unknown; table?: { head: string[]; rows: string[][] };
  }
  
  const colorOf = (f: FundSeries) => PROVIDER_COLOURS[f.provider] ?? '#15a394';
  const pctNum = (v: number | null) => (v == null ? null : +(v * 100).toFixed(2));
  const pctStr = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);
  const commonStart = (funds: FundSeries[]) => Math.max(...funds.map((f) => firstIndex(f.prices)));
  
  type M = ReturnType<typeof computeFundMetrics>;
  
  export function buildCharts(funds: FundSeries[], dates: string[]): ChartSpec[] {
    if (funds.length === 0) return [];
    const metrics = funds.map((f) => ({ f, m: computeFundMetrics({ dates, series: f.prices }) }));
    return [
      growth(funds, dates, 'full'),
      growth(funds, dates, '5y'),
      cumulative(funds, dates, 'full'),
      cumulative(funds, dates, '5y'),
      annualised(metrics),
      calendarYear(metrics),
      discreteAnnual(metrics),
      rolling2y(funds, dates),
      historicVol(funds, dates),
      stressDrawdown(metrics),
      histogram(metrics, 'monthly'),
      histogram(metrics, 'quarterly'),
      riskReturn(metrics),
      charges(funds),
      keyMetrics(metrics),
      comparisonSummary(metrics),
    ];
  }
  
  // ---------- line helpers ----------
  function lineOption(funds: FundSeries[], x: string[], data: (number | null)[][], yFmt: unknown) {
    return {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, type: 'scroll', data: funds.map((f) => f.name) },
      grid: { left: 58, right: 16, top: 12, bottom: 44 },
      xAxis: { type: 'category', boundaryGap: false, data: x, axisLabel: { formatter: (v: string) => v.slice(0, 4) } },
      yAxis: { type: 'value', scale: true, axisLabel: { formatter: yFmt } },
      series: funds.map((f, i) => ({ name: f.name, type: 'line', showSymbol: false, lineStyle: { width: 2, color: colorOf(f) }, itemStyle: { color: colorOf(f) }, data: data[i] })),
    };
  }
  
  function growth(funds: FundSeries[], dates: string[], mode: 'full' | '5y'): ChartSpec {
    const s = mode === 'full' ? commonStart(funds) : Math.max(dates.length - 60, 0);
    const x = dates.slice(s);
    const data = funds.map((f) => {
      const w = f.prices.slice(s);
      const base = w.find((v) => v != null) ?? null;
      return w.map((p) => (p == null || base == null ? null : Math.round((p / base) * 10000)));
    });
    return {
      key: mode === 'full' ? 'growth10k' : 'growth5y',
      title: mode === 'full' ? 'Growth of €10,000' : 'Growth of €10,000 — 5 Years',
      kind: 'echarts', option: lineOption(funds, x, data, (v: number) => '€' + Math.round(v / 1000) + 'k'),
    };
  }
  
  function cumulative(funds: FundSeries[], dates: string[], mode: 'full' | '5y'): ChartSpec {
    const s = mode === 'full' ? commonStart(funds) : Math.max(dates.length - 60, 0);
    const x = dates.slice(s);
    const data = funds.map((f) => {
      const w = f.prices.slice(s);
      const base = w.find((v) => v != null) ?? null;
      return w.map((p) => (p == null || base == null ? null : +((p / base - 1) * 100).toFixed(2)));
    });
    return {
      key: mode === 'full' ? 'cumulative' : 'cumulative5y',
      title: mode === 'full' ? 'Cumulative Performance' : 'Cumulative Performance — 5 Years',
      kind: 'echarts', option: lineOption(funds, x, data, '{value}%'),
    };
  }
  
  function rolling2y(funds: FundSeries[], dates: string[]): ChartSpec {
    const data = funds.map((f) => rollingCumulative(f.prices, 24).map((v) => pctNum(v)));
    return { key: 'rolling2y', title: 'Rolling 2-Year Performance', kind: 'echarts', option: lineOption(funds, dates, data, '{value}%') };
  }
  
  function historicVol(funds: FundSeries[], dates: string[]): ChartSpec {
    const data = funds.map((f) => rollingVolatility(f.prices, 12).map((v) => pctNum(v)));
    return { key: 'historicVol', title: 'Historic Volatility (rolling 12m)', kind: 'echarts', option: lineOption(funds, dates, data, '{value}%') };
  }
  
  // ---------- bar helpers ----------
  function barOption(cats: string[], metrics: { f: FundSeries }[], data: (number | null)[][], yFmt: string, pct = true) {
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => (v == null ? '—' : pct ? v + '%' : String(v)) },
      legend: { bottom: 0, type: 'scroll', data: metrics.map((x) => x.f.name) },
      grid: { left: 48, right: 16, top: 12, bottom: 44 },
      xAxis: { type: 'category', data: cats },
      yAxis: { type: 'value', axisLabel: { formatter: yFmt } },
      series: metrics.map((x, i) => ({ name: x.f.name, type: 'bar', itemStyle: { color: colorOf(x.f) }, data: data[i] })),
    };
  }
  
  function annualised(metrics: { f: FundSeries; m: M }[]): ChartSpec {
    const cats = ['3 yr p.a.', '5 yr p.a.', '7 yr p.a.', '10 yr p.a.'];
    const data = metrics.map(({ m }) => [pctNum(m.r3), pctNum(m.r5), pctNum(m.r7), pctNum(m.r10)]);
    return { key: 'annualised', title: 'Annualised Performance', kind: 'echarts', option: barOption(cats, metrics, data, '{value}%') };
  }
  
  function calendarYear(metrics: { f: FundSeries; m: M }[]): ChartSpec {
    const years = metrics[0].m.calendarYears.map((y) => String(y.year));
    const data = metrics.map(({ m }) => m.calendarYears.map((y) => pctNum(y.value)));
    return { key: 'calendarYear', title: 'Calendar-Year Returns', kind: 'echarts', option: barOption(years, metrics, data, '{value}%') };
  }
  
  function stressDrawdown(metrics: { f: FundSeries; m: M }[]): ChartSpec {
    const cats = metrics[0].m.stress.map((s) => s.label);
    const data = metrics.map(({ m }) => m.stress.map((s) => pctNum(s.drawdown)));
    return { key: 'stressDrawdown', title: 'Drawdown Through Market Stress Events', kind: 'echarts', option: barOption(cats, metrics, data, '{value}%') };
  }
  
  function histogram(metrics: { f: FundSeries; m: M }[], mode: 'monthly' | 'quarterly'): ChartSpec {
    const buckets = mode === 'monthly' ? metrics[0].m.histMonthly : metrics[0].m.histQuarterly;
    const cats = buckets.map((b) => b.label);
    const data = metrics.map(({ m }) => (mode === 'monthly' ? m.histMonthly : m.histQuarterly).map((b) => b.count));
    return {
      key: mode === 'monthly' ? 'histMonthly' : 'histQuarterly',
      title: mode === 'monthly' ? 'Performance Bucket Histogram — Monthly' : 'Performance Bucket Histogram — Quarterly',
      kind: 'echarts', option: barOption(cats, metrics, data, '{value}', false),
    };
  }
  
  function riskReturn(metrics: { f: FundSeries; m: M }[]): ChartSpec {
    const pts = metrics.filter((x) => x.m.vol5y != null && x.m.r5 != null).map((x) => ({
      name: x.f.name, value: [pctNum(x.m.vol5y), pctNum(x.m.r5)], itemStyle: { color: colorOf(x.f) },
    }));
    return {
      key: 'riskReturn', title: 'Risk vs Return (5-year)', kind: 'echarts',
      option: {
        tooltip: { trigger: 'item', formatter: (p: { data: { name: string; value: number[] } }) => `${p.data.name}<br/>vol ${p.data.value[0]}% · 5y ${p.data.value[1]}%` },
        grid: { left: 52, right: 20, top: 16, bottom: 48 },
        xAxis: { type: 'value', name: '5y volatility', nameLocation: 'middle', nameGap: 28, axisLabel: { formatter: '{value}%' }, scale: true },
        yAxis: { type: 'value', name: '5y return p.a.', axisLabel: { formatter: '{value}%' }, scale: true },
        series: [{ type: 'scatter', symbolSize: 16, data: pts, label: { show: true, position: 'top', fontSize: 10, formatter: (p: { data: { name: string } }) => p.data.name } }],
      },
    };
  }
  
  // ---------- tables ----------
  function discreteAnnual(metrics: { f: FundSeries; m: M }[]): ChartSpec {
    const years = metrics[0].m.calendarYears.map((y) => String(y.year));
    return {
      key: 'discreteAnnual', title: 'Discrete Annual Returns', kind: 'table',
      table: { head: ['Fund', ...years], rows: metrics.map(({ f, m }) => [f.name, ...m.calendarYears.map((y) => pctStr(y.value))]) },
    };
  }
  
  function charges(funds: FundSeries[]): ChartSpec {
    return {
      key: 'charges', title: 'Charges', kind: 'table',
      table: { head: ['Fund', 'AMC', 'Cost per €10,000 / yr'], rows: funds.map((f) => [f.name, `${f.amc}%`, `€${Math.round(f.amc * 100)}`]) },
    };
  }
  
  function keyMetrics(metrics: { f: FundSeries; m: M }[]): ChartSpec {
    return {
      key: 'keyMetrics', title: 'Key Metrics', kind: 'table',
      table: {
        head: ['Fund', 'Risk', '5y p.a.', 'Volatility', 'Sharpe', 'Max drawdown'],
        rows: metrics.map(({ f, m }) => [f.name, String(f.risk), pctStr(m.r5), pctStr(m.volFull), m.sharpeFull == null ? '—' : m.sharpeFull.toFixed(2), pctStr(m.mddFull)]),
      },
    };
  }
  
  function comparisonSummary(metrics: { f: FundSeries; m: M }[]): ChartSpec {
    return {
      key: 'comparisonSummary', title: 'Comparison Summary', kind: 'table',
      table: {
        head: ['Fund', 'YTD', '3y p.a.', '5y p.a.', '7y p.a.', 'Vol', 'Sharpe', 'Max DD', 'AMC'],
        rows: metrics.map(({ f, m }) => [
          f.name, pctStr(m.ytd), pctStr(m.r3), pctStr(m.r5), pctStr(m.r7),
          pctStr(m.volFull), m.sharpeFull == null ? '—' : m.sharpeFull.toFixed(2), pctStr(m.mddFull), `${f.amc}%`,
        ]),
      },
    };
  }