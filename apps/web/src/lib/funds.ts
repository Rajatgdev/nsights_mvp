import { api } from './api';

export interface FundMeta {
  id: string; name: string; provider: string;
  cls: string; risk: number; category: string; amc: number;
}
export interface FundsResp { dataMonth: string; count: number; funds: FundMeta[]; }
export interface SeriesResp { dataMonth: string; dates: string[]; funds: (FundMeta & { prices: (number | null)[] })[]; }

export async function fetchFunds(): Promise<FundsResp> {
  return (await api('/funds')) as FundsResp;
}
export async function fetchSeries(ids: string[]): Promise<SeriesResp> {
  const q = ids.length ? `?ids=${ids.join(',')}` : '';
  return (await api(`/funds/series${q}`)) as SeriesResp;
}