import { ANOMALY_COST_MULTIPLIER, PRIORITY_WEIGHTS } from "@/lib/constants/fx";
import {
  RailConfig,
  RailQuote,
  RouteDecisionResult,
  RouteRequest,
} from "@/lib/types/fx-routing";
import { roundTo } from "@/lib/utils/number";

import { buildRouteExplanation } from "@/lib/services/explanation-service";
import { getFxRateQuote } from "@/lib/services/fx-rate-service";
import { getActiveRails } from "@/lib/services/rail-service";

function computeRailQuote(params: {
  rail: RailConfig;
  amount: number;
  baseRate: number;
  fluctuatedRate: number;
  avgFeePercent: number;
}): Omit<RailQuote, "score"> {
  const { rail, amount, baseRate, fluctuatedRate, avgFeePercent } = params;

  // Fees in source currency
  const feeFromPercent = amount * rail.percentFee;
  const totalFeeSource = rail.flatFee + feeFromPercent;
  const feePercent = (totalFeeSource / amount) * 100;

  // FX logic
  // fluctuatedRate is the current market rate (e.g. 1 USD = 83 INR)
  // rail.fxMarkup is a decimal (e.g. 0.01 for 1%)
  // Effective rate for the user is market rate * (1 - markup)
  const fxRateAfterMarkup = fluctuatedRate * (1 - rail.fxMarkup);
  const convertedAmount = amount * fxRateAfterMarkup;

  // FX Loss in source currency = amount * rail.fxMarkup
  const fxLossSource = amount * rail.fxMarkup;
  
  // Total cost in source currency = fees + fx loss
  // This is what the user "loses" compared to mid-market rate
  const totalCostSource = totalFeeSource + fxLossSource;

  const platformMarginSource = fxLossSource + feeFromPercent * 0.1; // 10% of percent fee as extra margin

  const anomalyFlag = feePercent > avgFeePercent * ANOMALY_COST_MULTIPLIER;

  return {
    railCode: rail.code,
    railName: rail.name,
    fxRateBase: baseRate,
    fxRateWithFluctuation: fluctuatedRate,
    fxRateAfterMarkup: roundTo(fxRateAfterMarkup, 6),
    convertedAmount: roundTo(convertedAmount, 4),
    totalFeeSource: roundTo(totalFeeSource, 4),
    totalCostSource: roundTo(totalCostSource, 4),
    feePercent: roundTo(feePercent, 4),
    estimatedSettlementTimeHours: roundTo(rail.avgSettlementTimeHours, 2),
    reliabilityScore: roundTo(rail.reliabilityScore, 4),
    platformMarginSource: roundTo(platformMarginSource, 4),
    anomalyFlag,
  };
}

function normalizeScores(quotes: Omit<RailQuote, "score">[], priority: RouteRequest["priority"]): RailQuote[] {
  const weights = PRIORITY_WEIGHTS[priority];

  const maxCost = Math.max(...quotes.map((q) => q.totalCostSource));
  const minCost = Math.min(...quotes.map((q) => q.totalCostSource));
  const maxTime = Math.max(...quotes.map((q) => q.estimatedSettlementTimeHours));
  const minTime = Math.min(...quotes.map((q) => q.estimatedSettlementTimeHours));

  return quotes.map((quote) => {
    const normalizedCost =
      maxCost === minCost ? 0 : (quote.totalCostSource - minCost) / (maxCost - minCost);
    const normalizedTime =
      maxTime === minTime
        ? 0
        : (quote.estimatedSettlementTimeHours - minTime) / (maxTime - minTime);
    const reliabilityPenalty = 1 - quote.reliabilityScore;

    const score =
      weights.cost * normalizedCost +
      weights.time * normalizedTime +
      weights.reliability * reliabilityPenalty;

    return {
      ...quote,
      score: roundTo(score, 6),
    };
  });
}

function applyConstraints(quotes: RailQuote[], request: RouteRequest): RailQuote[] {
  return quotes.map((quote) => {
    if (request.constraints?.maxTime && quote.estimatedSettlementTimeHours > request.constraints.maxTime) {
      return {
        ...quote,
        disqualifiedReason: `Settlement time exceeds maxTime ${request.constraints.maxTime}h`,
      };
    }

    if (request.constraints?.maxFeePercent && quote.feePercent > request.constraints.maxFeePercent) {
      return {
        ...quote,
        disqualifiedReason: `Fee percent exceeds maxFeePercent ${request.constraints.maxFeePercent}%`,
      };
    }

    return quote;
  });
}

export async function computeOptimalRoute(request: RouteRequest): Promise<RouteDecisionResult> {
  const rails = await getActiveRails();
  if (!rails.length) {
    throw new Error("No active rails configured. Seed rails with `npm run prisma:seed`.");
  }

  const fxQuote = await getFxRateQuote({
    sourceCurrency: request.sourceCurrency,
    destinationCurrency: request.destinationCurrency,
    whatIfShockPercent: request.whatIfShockPercent,
  });

  const avgFeePercent =
    rails.reduce((acc, rail) => acc + ((rail.flatFee + request.amount * rail.percentFee) / request.amount) * 100, 0) /
    rails.length;

  const baseQuotes = rails.map((rail) =>
    computeRailQuote({
      rail,
      amount: request.amount,
      baseRate: fxQuote.baseRate,
      fluctuatedRate: fxQuote.fluctuatedRate,
      avgFeePercent,
    }),
  );

  const scored = normalizeScores(baseQuotes, request.priority);
  const constrained = applyConstraints(scored, request);
  const eligible = constrained.filter((quote) => !quote.disqualifiedReason);

  const selectedRoute = (eligible.length ? eligible : constrained)
    .slice()
    .sort((a, b) => a.score - b.score)[0];

  if (!selectedRoute) {
    throw new Error("Unable to select a route.");
  }

  const explanation = buildRouteExplanation({
    selected: selectedRoute,
    all: constrained,
    priority: request.priority,
  });

  return {
    request,
    selectedRoute,
    comparisons: constrained.sort((a, b) => a.score - b.score),
    explanation,
    metadata: {
      generatedAt: new Date().toISOString(),
      volatilityFactor: fxQuote.volatilityFactor,
      whatIfShockPercent: request.whatIfShockPercent ?? 0,
    },
  };
}
