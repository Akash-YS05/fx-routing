import { RailConfig, RailQuote, RouteHop, RouteRequest, Priority } from "@/lib/types/fx-routing";
import { getFxRateQuote } from "@/lib/services/fx-rate-service";
import { roundTo } from "@/lib/utils/number";
import { PRIORITY_WEIGHTS } from "@/lib/constants/fx";

type PathState = {
  currency: string;
  totalCostSource: number;
  totalTimeHours: number;
  reliabilityProduct: number;
  amount: number;
  hops: RouteHop[];
  totalHops: number;
};

export async function findOptimalRoute(params: {
  amount: number;
  sourceCurrency: string;
  destinationCurrency: string;
  priority: Priority;
  rails: RailConfig[];
  fxRateCache?: Map<string, import("./fx-rate-service").FxRateQuote>;
}): Promise<RailQuote | null> {
  const { amount, sourceCurrency, destinationCurrency, priority, rails, fxRateCache } = params;
  const weights = PRIORITY_WEIGHTS[priority];

  // Priority queue for Dijkstra (simple array-based for this prototype)
  const queue: PathState[] = [
    {
      currency: sourceCurrency,
      totalCostSource: 0,
      totalTimeHours: 0,
      reliabilityProduct: 1.0,
      amount: amount,
      hops: [],
      totalHops: 0,
    },
  ];

  const visited = new Map<string, number>(); // currency -> best score seen so far
  let bestFinalPath: PathState | null = null;
  let minBestScore = Infinity;

  while (queue.length > 0) {
    // Sort by score (weighted distance)
    queue.sort((a, b) => {
      const scoreA = calculatePathScore(a, weights, amount);
      const scoreB = calculatePathScore(b, weights, amount);
      return scoreA - scoreB;
    });

    const current = queue.shift()!;

    if (current.currency === destinationCurrency) {
      const finalScore = calculatePathScore(current, weights, amount);
      if (finalScore < minBestScore) {
        minBestScore = finalScore;
        bestFinalPath = current;
      }
      continue;
    }

    const currentScore = calculatePathScore(current, weights, amount);
    if (visited.has(current.currency) && visited.get(current.currency)! <= currentScore) {
      continue;
    }
    visited.set(current.currency, currentScore);

    // Limit hops to prevent infinite loops and unrealistic routes
    if (current.totalHops >= 3) continue;

    for (const rail of rails) {
      // Get possible destinations for this rail from current currency
      const possibleDestinations = await getPossibleDestinations(current.currency, rail);
      
      for (const dest of possibleDestinations) {
        if (current.hops.some(h => h.sourceCurrency === dest)) continue; // avoid cycles

        const fxQuote = await getFxRateQuote({
          sourceCurrency: current.currency,
          destinationCurrency: dest,
          cache: fxRateCache,
        });

        // Calculate cost for this specific hop
        // Note: we need to handle markup
        const rateWithMarkup = fxQuote.fluctuatedRate * (1 - rail.fxMarkup);
        const feeFromPercent = current.amount * rail.percentFee;
        const hopCostSource = (rail.flatFee + feeFromPercent + (current.amount * rail.fxMarkup));
        
        // We need to convert the cost of this hop back to the original source currency
        // To keep it simple, we'll track everything in source currency units relative to the original start
        const costInOriginalSource = hopCostSource * (amount / current.amount);

        const nextAmount = (current.amount - (rail.flatFee + feeFromPercent)) * rateWithMarkup;

        const nextHop: RouteHop = {
          railCode: rail.code,
          railName: rail.name,
          sourceCurrency: current.currency,
          destinationCurrency: dest,
          fxRateAfterMarkup: roundTo(rateWithMarkup, 6),
          totalCostSource: roundTo(costInOriginalSource, 4),
        };

        queue.push({
          currency: dest,
          totalCostSource: current.totalCostSource + costInOriginalSource,
          totalTimeHours: current.totalTimeHours + rail.avgSettlementTimeHours,
          reliabilityProduct: current.reliabilityProduct * rail.reliabilityScore,
          amount: nextAmount,
          hops: [...current.hops, nextHop],
          totalHops: current.totalHops + 1,
        });
      }
    }
  }

  if (!bestFinalPath) return null;

  return finalizePathToQuote(bestFinalPath, amount, sourceCurrency, destinationCurrency, priority);
}

function calculatePathScore(state: PathState, weights: { cost: number; time: number; reliability: number }, initialAmount: number): number {
  // Heuristic: normalize cost by initial amount to make it comparable to other weights
  const costFactor = state.totalCostSource / initialAmount;
  const timeFactor = state.totalTimeHours / 48; // normalize by 48h
  // Use geometric mean for reliability across hops (each hop reduces reliability multiplicatively)
  const reliabilityFactor = 1 - Math.pow(state.reliabilityProduct, 1 / Math.max(1, state.totalHops));

  return (
    weights.cost * costFactor +
    weights.time * timeFactor +
    weights.reliability * reliabilityFactor
  );
}

async function getPossibleDestinations(currentCurrency: string, rail: RailConfig): Promise<string[]> {
  const allCurrencies = ["USD", "EUR", "GBP", "INR"];
  
  if (rail.supportedPairs) {
    return rail.supportedPairs
      .filter(p => p.startsWith(`${currentCurrency}_`))
      .map(p => p.split("_")[1]);
  }

  // If no restricted pairs, it can go to any other currency
  return allCurrencies.filter(c => c !== currentCurrency);
}

function finalizePathToQuote(path: PathState, initialAmount: number, source: string, dest: string, priority: Priority): RailQuote {
  const firstHop = path.hops[0];
  const weights = PRIORITY_WEIGHTS[priority];

  // Calculate proper score using weighted scoring (same logic as normalizeScores)
  const costFactor = path.totalCostSource / initialAmount;
  const timeFactor = path.totalTimeHours / 48;
  const reliabilityFactor = 1 - Math.pow(path.reliabilityProduct, 1 / path.totalHops); // Geometric mean for reliability

  const score = roundTo(
    weights.cost * costFactor + weights.time * timeFactor + weights.reliability * reliabilityFactor,
    6
  );

  return {
    railCode: path.hops.length > 1 ? "MULTI_HOP" : firstHop.railCode,
    railName: path.hops.length > 1 ? `Multi-Hop (${path.hops.map(h => h.railCode).join(" → ")})` : firstHop.railName,
    fxRateBase: 0,
    fxRateWithFluctuation: 0,
    fxRateAfterMarkup: roundTo(path.amount / initialAmount, 6),
    convertedAmount: roundTo(path.amount, 4),
    totalFeeSource: roundTo(path.totalCostSource, 4),
    totalCostSource: roundTo(path.totalCostSource, 4),
    feePercent: roundTo((path.totalCostSource / initialAmount) * 100, 4),
    estimatedSettlementTimeHours: roundTo(path.totalTimeHours, 2),
    reliabilityScore: roundTo(Math.pow(path.reliabilityProduct, 1 / path.totalHops), 4),
    platformMarginSource: roundTo(path.totalCostSource * 0.1, 4),
    anomalyFlag: false,
    score,
    hops: path.hops,
  };
}
