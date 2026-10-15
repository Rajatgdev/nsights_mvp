export type Approach = 'core-satellite' | 'equal-weighted' | 'multi-manager' | 'multi-strategy';

export interface HoldingInput {
  fundId: string; name: string; provider: string; assetClass: string;
  riskRating: number; manager?: string | null; style?: string | null;
  region?: string | null; sfdrArticle?: number | null; riskControlled?: boolean | null;
  weightBp: number; series?: (number | null)[];
}

export type StructureLabel = 'Single' | 'Core/Satellite' | 'Equal-weighted' | 'Diversified blend';
export type RiskLabel = 'Cautious' | 'Balanced' | 'Growth' | 'High Growth';

export interface PortfolioWarning { code: 'risk_spread' | 'vol_ratio' | 'same_manager'; message: string; }

export interface Suggestion {
  fundId: string; name: string; provider: string; assetClass: string;
  riskRating: number; score: number; reason: string;
}

export interface PortfolioProfile {
  structure: StructureLabel; riskLabel: RiskLabel; averageFundRisk: number; warnings: PortfolioWarning[];
}

export interface PortfolioAnalysis extends PortfolioProfile {
  blendSeries: (number | null)[];
  metrics: Record<string, unknown>;
  indicativeRiskClass: number | null;
  historyLimitedBy: { fundId: string; name: string; startDate: string | null } | null;
}

export interface CandidateFund {
  fundId: string; name: string; provider: string; assetClass: string;
  riskRating: number; manager?: string | null; style?: string | null;
  sfdrArticle?: number | null; riskControlled?: boolean | null;
}