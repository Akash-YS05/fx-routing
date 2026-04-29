import { prisma } from "@/db/prisma";
import { RouteDecisionResult, RouteRequest } from "@/lib/types/fx-routing";

export async function saveRouteSimulation(result: RouteDecisionResult): Promise<void> {
  const selectedRail = await prisma.rail.findUnique({
    where: { code: result.selectedRoute.railCode },
    select: { id: true },
  });

  if (!selectedRail) {
    return;
  }

  const constraints = result.request.constraints;

  await prisma.transaction.create({
    data: {
      amount: result.request.amount,
      sourceCurrency: result.request.sourceCurrency,
      destinationCurrency: result.request.destinationCurrency,
      priority: result.request.priority,
      maxTime: constraints?.maxTime,
      maxFeePercent: constraints?.maxFeePercent,
      selectedRailCode: result.selectedRoute.railCode,
      selectedRailScore: result.selectedRoute.score,
      totalCostSource: result.selectedRoute.totalCostSource,
      settlementTimeHours: result.selectedRoute.estimatedSettlementTimeHours,
      explanation: result.explanation,
      comparisonPayload: result.comparisons,
      whatIfShockPercent: result.metadata.whatIfShockPercent,
      anomalyFlag: result.selectedRoute.anomalyFlag,
      platformMarginSource: result.selectedRoute.platformMarginSource,
      railId: selectedRail.id,
    },
  });
}

export async function runSimulationBatch(params: {
  count: number;
  sourceCurrency: string;
  destinationCurrency: string;
  priority: RouteRequest["priority"];
  computeRoute: (request: RouteRequest) => Promise<RouteDecisionResult>;
}) {
  const chosenCountByRail: Record<string, number> = {};
  const totalCostByRail: Record<string, number> = {};

  const BATCH_SIZE = 100;
  const batches = Math.ceil(params.count / BATCH_SIZE);

  for (let i = 0; i < batches; i++) {
    const currentBatchSize = Math.min(BATCH_SIZE, params.count - i * BATCH_SIZE);
    const promises = Array.from({ length: currentBatchSize }).map(() => {
      const amount = Math.floor(100 + Math.random() * 9_900);
      return params.computeRoute({
        amount,
        sourceCurrency: params.sourceCurrency,
        destinationCurrency: params.destinationCurrency,
        priority: params.priority,
      });
    });

    const results = await Promise.all(promises);

    for (const result of results) {
      const railCode = result.selectedRoute.railCode;
      chosenCountByRail[railCode] = (chosenCountByRail[railCode] ?? 0) + 1;
      totalCostByRail[railCode] = (totalCostByRail[railCode] ?? 0) + result.selectedRoute.totalCostSource;
    }
  }

  const averageCostByRail: Record<string, number> = {};
  for (const [railCode, totalCost] of Object.entries(totalCostByRail)) {
    averageCostByRail[railCode] = Number((totalCost / (chosenCountByRail[railCode] ?? 1)).toFixed(4));
  }

  return {
    totalRuns: params.count,
    chosenCountByRail,
    averageCostByRail,
  };
}
