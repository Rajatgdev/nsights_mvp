import { KABEN } from './insights-data';
import type { ChartSpec } from './charts';

const PAL = ['#15a394', '#2563c9', '#e6800a', '#8453d6', '#d8556a', '#0d9bbf', '#7a8794', '#b4691f'];
const pc = (v: number | null) => (v == null ? null : +(v * 100).toFixed(2));
const ps = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);
const yr = (m: string) => m.slice(0, 4);

export const INSIGHTS_AS_AT = KABEN.asAt;
export const INSIGHTS_SOURCE = KABEN.source;

// ---- builders ----
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

// ---- datasets ----
const { equityYtd, equityHistoric, yields10y, nvidia, drawdownCounts, assetClass, sectors, fixedIncome, intraYear, bestWorst, missedDays, retDist, probHigher } = KABEN as any;

const equityYtdChart = barCats('ins-equityYtd', 'Equity Markets 2026 YTD — € vs local', equityYtd.names,
  [{ name: 'Euro', data: equityYtd.euro.map(pc), color: '#15a394' }, { name: 'Local', data: equityYtd.local.map(pc), color: '#2563c9' }]);

const equityHistChart = lineMonths('ins-equityHist', 'Cumulative total return since 2005', equityHistoric.months, equityHistoric.series);

const yieldsChart = lineMonths('ins-yields', '10-Year Government Bond Yields', yields10y.months, yields10y.series);

const sectorsLatest = barCats('ins-sectors', `Sector returns · ${sectors.rows[0].label}`, sectors.names,
  [{ name: sectors.rows[0].label, data: sectors.rows[0].values.map(pc), color: '#15a394' }]);

const nvidiaChart = barCats('ins-nvidia', 'NVIDIA earnings per share (indexed)', nvidia.labels,
  [{ name: 'EPS', data: nvidia.values, color: '#15a394' }], false);

const drawdownChart = barCats('ins-drawdown', 'Market declines since 1928 — count by depth', drawdownCounts.thresholds,
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

export const INSIGHTS_TABS: { id: string; label: string; charts: ChartSpec[] }[] = [
  { id: 'popular', label: 'Popular', charts: [equityYtdChart, bestWorstChart, missedDaysChart, probHigherChart] },
  { id: 'equities', label: 'Equities', charts: [equityHistChart, sectorsLatest, nvidiaChart, drawdownChart] },
  { id: 'fixed', label: 'Fixed Income', charts: [fixedIncomeYtd, fixedIncomeHist, yieldsChart] },
  { id: 'bonds', label: 'Bonds vs Equities', charts: [assetClassYtd, assetClassHist] },
  { id: 'alts', label: 'Alternatives', charts: [intraYearChart, retDistChart] },
];