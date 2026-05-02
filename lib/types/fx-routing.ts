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
  supportedPairs?: string[]; // Optional: if provided, rail only supports these pairs
};

export type RouteHop = {
  railCode: string;
  railName: string;
  sourceCurrency: string;
  destinationCurrency: string;
  fxRateAfterMarkup: number;
  totalCostSource: number;
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
  hops?: RouteHop[];
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

export type ReplayHistoryItem = {
  id: string;
  createdAt: string;
  amount: number;
  sourceCurrency: string;
  destinationCurrency: string;
  priority: Priority;
  maxTime?: number;
  maxFeePercent?: number;
  whatIfShockPercent?: number;
  selectedRailCode: string;
  totalCostSource: number;
  settlementTimeHours: number;
  anomalyFlag: boolean;
};

export type ReplayHistoryPage = {
  items: ReplayHistoryItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};
