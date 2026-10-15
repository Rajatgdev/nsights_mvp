import { KABEN } from './insights-data';
import type { ChartSpec } from './charts';

const PAL = ['#15a394', '#2563c9', '#e6800a', '#8453d6', '#d8556a', '#0d9bbf', '#7a8794', '#b4691f'];
// 11-colour palette for sector-composition charts
const SPAL = ['#2563c9', '#15a394', '#8e44ad', '#e6800a', '#c0392b', '#0d9bbf', '#7a8794', '#b4691f', '#5b8c3f', '#d8556a', '#9aa3b8'];
const pc = (v: number | null) => (v == null ? null : +(v * 100).toFixed(2));
const ps = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);
const yr = (m: string) => m.slice(0, 4);
const eur = (v: number) => '€' + Math.round(v).toLocaleString('en-IE');

export const INSIGHTS_AS_AT = KABEN.asAt;
export const INSIGHTS_SOURCE = KABEN.source;

// ---- generic builders -----------------------------------------------------
function barCats(key: string, title: string, cats: string[], series: { name: string; data: (number | null)[]; color: string }[], pctAxis = true): ChartSpec {
  return {
    key, title, kind: 'echarts',
    option: {
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => (v == null ? '—' : v + (pctAxis ? '%' : '')) },
      legend: series.length > 1 ? { bottom: 0, data: series.map((s) => s.name) } : undefined,
      grid: { left: 48, right: 16, top: 12, bottom: series.length > 1 ? 44 : 50 },
      xAxis: { type: 'category', data: cats, axisLabel: { interval: 0, rotate: cats.length > 6 ? 25 : 0, fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { formatter: pctAxis ? '{value}%' : '{value}' } },
      series: series.map((s) => ({ name: s.name, type: 'bar', data: s.data, itemStyle: { color: s.color } })),
    },
  };
}
function lineMonths(key: string, title: string, months: string[], series: { label: string; values: number[]; color?: string }[]): ChartSpec {
  return {
    key, title, kind: 'echarts',
    option: {
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => (v == null ? '—' : v + '%') },
      legend: { bottom: 0, type: 'scroll', data: series.map((s) => s.label) },
      grid: { left: 52, right: 16, top: 12, bottom: 44 },
      xAxis: { type: 'category', boundaryGap: false, data: months, axisLabel: { formatter: (v: string) => yr(v) } },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
      series: series.map((s, i) => ({ name: s.label, type: 'line', showSymbol: false, lineStyle: { width: 2, color: s.color ?? PAL[i % PAL.length] }, itemStyle: { color: s.color ?? PAL[i % PAL.length] }, data: s.values.map(pc) })),
    },
  };
}
function yearTable(key: string, title: string, names: string[], hist: { year: string; values: number[] }[]): ChartSpec {
  return { key, title, kind: 'table', table: { head: ['Category', ...hist.map((h) => h.year)], rows: names.map((n, i) => [n, ...hist.map((h) => ps(h.values[i]))]) } };
}
// Returns heatmap (periodic-table style). xCats across, yRows down (first row shown at top).
// Values are decimals; rendered as % with a diverging red→green scale.
function heatmap(key: string, title: string, xCats: string[], yRows: { name: string; vals: number[] }[], bounds?: { min: number; max: number }): ChartSpec {
  const yCats = yRows.map((r) => r.name).reverse();
  const cells: [number, number, number][] = [];
  yRows.forEach((row, ri) => {
    const y = yRows.length - 1 - ri;
    row.vals.forEach((v, xi) => cells.push([xi, y, +(v * 100).toFixed(1)]));
  });
  const flat = yRows.flatMap((r) => r.vals.map((v) => v * 100));
  const min = bounds ? bounds.min : Math.floor(Math.min(...flat) / 5) * 5;
  const max = bounds ? bounds.max : Math.ceil(Math.max(...flat) / 5) * 5;
  return {
    key, title, kind: 'echarts',
    option: {
      tooltip: { position: 'top', formatter: (p: any) => `${yCats[p.value[1]]} · ${xCats[p.value[0]]}: ${p.value[2]}%` },
      grid: { left: 8, right: 16, top: 10, bottom: 52, containLabel: true },
      xAxis: { type: 'category', data: xCats, splitArea: { show: true }, axisLabel: { fontSize: 11 } },
      yAxis: { type: 'category', data: yCats, splitArea: { show: true }, axisLabel: { fontSize: 10 } },
      visualMap: { min, max, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 14, itemHeight: 90, inRange: { color: ['#c0392b', '#f4f4f2', '#1c8a4e'] }, textStyle: { fontSize: 10 } },
      series: [{ type: 'heatmap', data: cells, label: { show: true, fontSize: 9, formatter: (p: any) => p.value[2] + '%' }, itemStyle: { borderColor: '#fff', borderWidth: 1 } }],
    },
  };
}
// € growth lines (no % axis)
function euroLine(key: string, title: string, xLabels: string[], series: { name: string; values: number[]; color?: string }[]): ChartSpec {
  return {
    key, title, kind: 'echarts',
    option: {
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => eur(v) },
      legend: { bottom: 0, data: series.map((s) => s.name) },
      grid: { left: 64, right: 16, top: 12, bottom: 44 },
      xAxis: { type: 'category', boundaryGap: false, data: xLabels, axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => '€' + (v / 1000) + 'k', fontSize: 10 } },
      series: series.map((s, i) => ({ name: s.name, type: 'line', showSymbol: false, lineStyle: { width: 2, color: s.color ?? PAL[i % PAL.length] }, itemStyle: { color: s.color ?? PAL[i % PAL.length] }, data: s.values })),
    },
  };
}

// ---- datasets -------------------------------------------------------------
const K = KABEN as any;
const { equityYtd, equityHistoric, yields10y, nvidia, drawdownCounts, assetClass, sectors, fixedIncome, intraYear, bestWorst, missedDays, retDist, probHigher, gics, sectorWeightsHistory } = K;

// ===== existing charts =====
const equityYtdChart = barCats('ins-equityYtd', 'Equity Markets 2026 YTD — € vs local', equityYtd.names,
  [{ name: 'Euro', data: equityYtd.euro.map(pc), color: '#15a394' }, { name: 'Local', data: equityYtd.local.map(pc), color: '#2563c9' }]);
const equityHistChart = lineMonths('ins-equityHist', 'Major equity markets since 2005 — cumulative (€)', equityHistoric.months, equityHistoric.series);
const yieldsChart = lineMonths('ins-yields', '10-Year Government Bond Yields', yields10y.months, yields10y.series);
const nvidiaChart = barCats('ins-nvidia', 'NVIDIA revenue ($bn) — the AI capex cycle', nvidia.labels,
  [{ name: 'Revenue $bn', data: nvidia.values, color: '#15a394' }], false);
const drawdownChart = barCats('ins-drawdown', 'S&P 500 drawdowns since 1928 — count by depth', drawdownCounts.thresholds,
  [{ name: 'Occurrences', data: drawdownCounts.counts, color: '#d8556a' }], false);
const assetClassYtd = barCats('ins-acYtd', 'Asset classes 2026 YTD (€)', assetClass.names,
  [{ name: 'YTD €', data: assetClass.ytdEuro.map(pc), color: '#15a394' }]);
const assetClassHist = yearTable('ins-acHist', 'Asset class returns by calendar year', assetClass.historicNames, assetClass.historic);
const fixedIncomeYtd = barCats('ins-fiYtd', 'Fixed income 2026 YTD', fixedIncome.ytdNames,
  [{ name: 'YTD', data: fixedIncome.ytd.map(pc), color: '#2563c9' }]);
const fixedIncomeHist = yearTable('ins-fiHist', 'Fixed income returns by calendar year', fixedIncome.historicNames, fixedIncome.historic);
const bestWorstChart = barCats('ins-bestWorst', 'Best vs worst equity returns by holding period', bestWorst.periods,
  [{ name: 'Best', data: bestWorst.best.map(pc), color: '#1c8a4e' }, { name: 'Worst', data: bestWorst.worst.map(pc), color: '#c0392b' }]);
const missedDaysChart = barCats('ins-missed', 'Cost of missing the best days', missedDays.labels,
  [{ name: 'Annualised return', data: missedDays.values.map(pc), color: '#e6800a' }]);
const probHigherChart = barCats('ins-prob', 'Probability of a positive return by horizon', probHigher.periods,
  [{ name: 'Probability', data: probHigher.probs.map(pc), color: '#15a394' }]);
const intraYearChart: ChartSpec = {
  key: 'ins-intraYear', title: 'Annual return vs largest intra-year drop', kind: 'echarts',
  option: {
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => (v == null ? '—' : v + '%') },
    legend: { bottom: 0, data: ['Annual return', 'Max intra-year drop'] },
    grid: { left: 48, right: 16, top: 12, bottom: 44 },
    xAxis: { type: 'category', data: intraYear.years.map(String) },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    series: [
      { name: 'Annual return', type: 'bar', data: intraYear.ret.map(pc), itemStyle: { color: '#15a394' } },
      { name: 'Max intra-year drop', type: 'line', showSymbol: false, data: intraYear.maxDD.map(pc), lineStyle: { color: '#c0392b' }, itemStyle: { color: '#c0392b' } },
    ],
  },
};
const retDistChart = barCats('ins-retDist', 'Distribution of annual equity returns', retDist.buckets,
  [{ name: 'Years', data: retDist.counts, color: '#8453d6' }], false);

// ===== NEW: GICS sector suite (equities) =====
const GYEARS: string[] = gics.years;                    // ['2024','2025','2026 YTD']
const sectorHeatmap = heatmap('ins-gicsHeat', 'S&P 500 GICS sectors — total return by year',
  GYEARS, gics.sectors.map((s: any) => ({ name: s.short, vals: s.r })), { min: -10, max: 50 });

const gY = gics.sectors.slice().sort((a: any, b: any) => b.r[2] - a.r[2]);
const gicsYtd: ChartSpec = {
  key: 'ins-gicsYtd', title: 'S&P 500 GICS sectors — 2026 YTD vs index', kind: 'echarts',
  option: {
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => (v == null ? '—' : v + '%') },
    grid: { left: 40, right: 16, top: 16, bottom: 64 },
    xAxis: { type: 'category', data: gY.map((s: any) => s.short), axisLabel: { interval: 0, rotate: 30, fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    series: [{
      type: 'bar', data: gY.map((s: any) => +(s.r[2] * 100).toFixed(1)),
      itemStyle: { color: (p: any) => (p.value >= 0 ? '#15a394' : '#c0392b') },
      markLine: { silent: true, symbol: 'none', data: [{ yAxis: +(gics.indexYTD2026 * 100).toFixed(1), label: { formatter: 'Index ' + (gics.indexYTD2026 * 100).toFixed(1) + '%', position: 'insideEndTop', fontSize: 10 }, lineStyle: { color: '#8453d6', type: 'dashed' } }] },
    }],
  },
};

// contribution to index = weight(%) × return(decimal) = percentage points
const contrib26 = gics.sectors.map((s: any) => ({ short: s.short, v: +(s.w[2] * s.r[2]).toFixed(2) })).sort((a: any, b: any) => b.v - a.v);
const sectorContribution: ChartSpec = {
  key: 'ins-gicsContrib', title: 'Sector contribution to S&P 500 return — 2026 YTD (pp)', kind: 'echarts',
  option: {
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => (v == null ? '—' : v + ' pp') },
    grid: { left: 44, right: 16, top: 16, bottom: 64 },
    xAxis: { type: 'category', data: contrib26.map((d: any) => d.short), axisLabel: { interval: 0, rotate: 30, fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}pp' } },
    series: [{ type: 'bar', data: contrib26.map((d: any) => ({ value: d.v, itemStyle: { color: d.v >= 0 ? '#2563c9' : '#c0392b' } })) }],
  },
};

// 3-year summed contribution waterfall
const wfRaw = gics.sectors.map((s: any) => ({ short: s.short, v: +((s.w[0] * s.r[0] + s.w[1] * s.r[1] + s.w[2] * s.r[2])).toFixed(2) })).sort((a: any, b: any) => b.v - a.v);
const wfCats: string[] = [...wfRaw.map((d: any) => d.short), 'Total'];
const wfBase: number[] = []; const wfVal: any[] = [];
let cum = 0;
wfRaw.forEach((d: any) => { const start = cum; cum += d.v; wfBase.push(+Math.min(start, cum).toFixed(2)); wfVal.push({ value: +Math.abs(d.v).toFixed(2), itemStyle: { color: d.v >= 0 ? '#15a394' : '#c0392b' } }); });
wfBase.push(0); wfVal.push({ value: +cum.toFixed(2), itemStyle: { color: '#103743' } });
const sectorWaterfall: ChartSpec = {
  key: 'ins-gicsWf', title: 'Sector contribution waterfall — three years to S&P 500 return (pp)', kind: 'echarts',
  option: {
    tooltip: { trigger: 'axis', formatter: (ps2: any) => { const i = ps2[0].dataIndex; return `${wfCats[i]}: ${i === wfCats.length - 1 ? '' : '+'}${wfVal[i].value} pp`; } },
    grid: { left: 44, right: 16, top: 16, bottom: 70 },
    xAxis: { type: 'category', data: wfCats, axisLabel: { interval: 0, rotate: 35, fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}pp' } },
    series: [
      { type: 'bar', stack: 'wf', itemStyle: { color: 'transparent' }, emphasis: { itemStyle: { color: 'transparent' } }, data: wfBase },
      { type: 'bar', stack: 'wf', data: wfVal, label: { show: true, position: 'top', fontSize: 9, formatter: (p: any) => p.value } },
    ],
  },
};

// contribution detail table
const cRows = gics.sectors.map((s: any) => {
  const c = [s.w[0] * s.r[0], s.w[1] * s.r[1], s.w[2] * s.r[2]];
  return { name: s.name, w26: s.w[2], c, tot: c[0] + c[1] + c[2] };
});
const cGrand = cRows.reduce((a: number, r: any) => a + r.tot, 0);
const sectorContribTable: ChartSpec = {
  key: 'ins-gicsTable', title: 'Sector contribution — three-year detail',
  kind: 'table',
  table: {
    head: ['Sector', 'Weight ’26', '2024 pp', '2025 pp', '2026 pp', '3-yr Σ pp', 'Share of gain'],
    rows: cRows.sort((a: any, b: any) => b.tot - a.tot).map((r: any) => [
      r.name, r.w26.toFixed(1) + '%', r.c[0].toFixed(2), r.c[1].toFixed(2), r.c[2].toFixed(2), r.tot.toFixed(2), (100 * r.tot / cGrand).toFixed(0) + '%',
    ]),
  },
};

// sector weights over time (stacked composition)
const sectorWeights: ChartSpec = {
  key: 'ins-secWeights', title: 'S&P 500 sector weights — 1985 · 1995 · 2005 · 2025', kind: 'echarts',
  option: {
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => (v == null ? '—' : v + '%') },
    legend: { bottom: 0, type: 'scroll', data: sectorWeightsHistory.rows.map((r: any) => r.name) },
    grid: { left: 40, right: 16, top: 12, bottom: 56 },
    xAxis: { type: 'category', data: sectorWeightsHistory.years },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    series: sectorWeightsHistory.rows.map((r: any, i: number) => ({ name: r.name, type: 'bar', stack: 'w', data: r.w, itemStyle: { color: SPAL[i % SPAL.length] } })),
  },
};

// ===== NEW: fixed income & asset-class heatmaps =====
const fiYearsChrono = fixedIncome.historic.map((h: any) => h.year).slice().reverse();
const fiRows = fixedIncome.historicNames.map((n: string, i: number) => ({ name: n, vals: fixedIncome.historic.slice().reverse().map((h: any) => h.values[i]) }));
const fixedIncomeHeatmap = heatmap('ins-fiHeat', 'Fixed income — total return by calendar year', fiYearsChrono, fiRows, { min: -10, max: 15 });

const acYearsChrono = assetClass.historic.map((h: any) => h.year).slice().reverse();
const acRows = assetClass.historicNames.map((n: string, i: number) => ({ name: n, vals: assetClass.historic.slice().reverse().map((h: any) => h.values[i]) }));
const assetClassHeatmap = heatmap('ins-acHeat', 'Asset-class returns by calendar year — best to worst', acYearsChrono, acRows, { min: -15, max: 50 });

// bonds vs equities by calendar year
const EQI = [0, 1, 2], BDI = [3, 4];
const avg = (vals: number[], idx: number[]) => idx.reduce((s, i) => s + vals[i], 0) / idx.length;
const acYearsBE = assetClass.historic.map((h: any) => h.year);
const bondsVsEquities = barCats('ins-bve', 'Bonds vs equities by calendar year (€)', acYearsBE,
  [
    { name: 'Equities (avg)', data: assetClass.historic.map((h: any) => pc(avg(h.values, EQI))), color: '#15a394' },
    { name: 'Bonds (avg)', data: assetClass.historic.map((h: any) => pc(avg(h.values, BDI))), color: '#2f6fd0' },
  ]);

// 10-year yields table (current / 5y ago / 30y low)
const yieldsTable: ChartSpec = {
  key: 'ins-yieldsTbl', title: '10-year yields — where they are and where they were', kind: 'table',
  table: {
    head: ['10-Year', 'Current', '~5 Years Ago', '30-Year Low'],
    rows: yields10y.series.map((s: any) => { const v: number[] = s.values; return [s.label, ps(v[v.length - 1]), ps(v[v.length - 11]), ps(Math.min(...v))]; }),
  },
};

// ===== NEW: behavioural =====
const BEAR_SPAN = 2026 - 1928;
const bearMarkets: ChartSpec = {
  key: 'ins-bear', title: 'Bear markets — frequency since 1928', kind: 'table',
  table: {
    head: ['Decline', 'Occurrences', 'On average'],
    rows: drawdownCounts.thresholds.map((t: string, i: number) => { const c = drawdownCounts.counts[i]; return [t, String(c), `every ~${(BEAR_SPAN / c).toFixed(1)} yrs`]; }),
  },
};

// ===== NEW: planning (formula-only teaching charts) =====
const r72Rates = [2, 4, 6, 8, 10, 12];
const rule72 = barCats('ins-rule72', 'The Rule of 72 — years to double your money', r72Rates.map((r) => r + '%'),
  [{ name: 'Years to double', data: r72Rates.map((r) => +(72 / r).toFixed(1)), color: '#2563c9' }], false);

const recLoss = [-0.1, -0.2, -0.3, -0.4, -0.5, -0.6, -0.7];
const recovery = barCats('ins-recovery', '% gain required to recover from a loss', recLoss.map((l) => (l * 100).toFixed(0) + '%'),
  [{ name: 'Gain needed', data: recLoss.map((l) => +(((1 / (1 + l)) - 1) * 100).toFixed(0)), color: '#d8556a' }]);

const cYears = Array.from({ length: 31 }, (_, i) => 'Yr ' + i);
const compounding = euroLine('ins-compound', 'Power of compounding — €100,000 over 30 years',
  cYears, [0.02, 0.04, 0.06, 0.08].map((r, i) => ({ name: (r * 100) + '%', values: Array.from({ length: 31 }, (_, y) => Math.round(100000 * Math.pow(1 + r, y))), color: PAL[i] })));

const esAges = [25, 30, 35, 40, 45, 50];
const esR = 0.06 / 12;
const earlyStart = barCats('ins-early', 'The best time to start — €500/month at 6%, value at 65', esAges.map((a) => 'Start at ' + a),
  [{ name: 'Value at 65', data: esAges.map((a) => { const n = (65 - a) * 12; return Math.round(500 * ((Math.pow(1 + esR, n) - 1) / esR)); }), color: '#15a394' }], false);

// ---- tabs -----------------------------------------------------------------
export const INSIGHTS_TABS: { id: string; label: string; charts: ChartSpec[] }[] = [
  { id: 'popular', label: 'Popular', charts: [equityYtdChart, bestWorstChart, missedDaysChart, probHigherChart, nvidiaChart] },
  { id: 'equities', label: 'Equities', charts: [equityHistChart, sectorHeatmap, gicsYtd, sectorContribution, sectorWaterfall, sectorContribTable, sectorWeights, drawdownChart] },
  { id: 'fixed', label: 'Fixed Income', charts: [fixedIncomeYtd, fixedIncomeHist, fixedIncomeHeatmap, yieldsChart, yieldsTable] },
  { id: 'bonds', label: 'Bonds vs Equities', charts: [assetClassYtd, assetClassHist, bondsVsEquities, assetClassHeatmap] },
  { id: 'alts', label: 'Alternatives', charts: [intraYearChart, retDistChart] },
  { id: 'behavioural', label: 'Behavioural', charts: [bearMarkets, retDistChart, intraYearChart] },
  { id: 'planning', label: 'Planning', charts: [rule72, recovery, compounding, earlyStart] },
];