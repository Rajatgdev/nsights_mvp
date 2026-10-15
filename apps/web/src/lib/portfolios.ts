import { api } from './api';

export interface SavedPortfolio { id: string; name: string; kind: 'house' | 'personal'; approach: string | null; ownerUserId: string | null; }
export interface PortfolioDetail { id: string; name: string; kind: string; approach: string | null; holdings: { fundId: string; weightBp: number; role: string | null }[]; }

export async function listPortfolios(): Promise<SavedPortfolio[]> { return (await api('/portfolios')).portfolios; }
export async function getPortfolio(id: string): Promise<PortfolioDetail> { return (await api(`/portfolios/${id}`)).portfolio; }
export async function savePortfolio(body: { name: string; kind: 'house' | 'personal'; approach?: string; holdings: { fundId: string; weightBp: number }[] }): Promise<{ id: string }> {
  return api('/portfolios', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
export async function deletePortfolio(id: string) { return api(`/portfolios/${id}`, { method: 'DELETE' }); }