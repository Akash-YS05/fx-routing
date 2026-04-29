export type Priority = "cheap" | "fast" | "balanced";

export type RouteConstraints = {
  maxTime?: number;
  maxFeePercent?: number;
};

export type RouteRequest = {
  amount: number;
  sourceCurrency: string;
  destinationCurrency: string;
  priority: Priority;
  constraints?: RouteConstraints;
  whatIfShockPercent?: number;
};

export type RailConfig = {
  id: string;
  code: string;
  name: string;
  flatFee: number;
  percentFee: number;
  fxMarkup: number;
  avgSettlementTimeHours: number;
  reliabilityScore: number;
};

export type RailQuote = {
  railCode: string;
  railName: string;
  fxRateBase: number;
  fxRateWithFluctuation: number;
  fxRateAfterMarkup: number;
  convertedAmount: number;
  totalFeeSource: number;
  totalCostSource: number;
  feePercent: number;
  estimatedSettlementTimeHours: number;
  reliabilityScore: number;
  platformMarginSource: number;
  anomalyFlag: boolean;
  score: number;
  disqualifiedReason?: string;
};

export type RouteDecisionResult = {
  request: RouteRequest;
  selectedRoute: RailQuote;
  comparisons: RailQuote[];
  explanation: string;
  metadata: {
    generatedAt: string;
    volatilityFactor: number;
    whatIfShockPercent: number;
  };
};

export type SimulationSummary = {
  totalRuns: number;
  chosenCountByRail: Record<string, number>;
  averageCostByRail: Record<string, number>;
};
