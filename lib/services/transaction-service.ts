import { prisma } from "@/db/prisma";
import {
  ReplayHistoryItem,
  ReplayHistoryPage,
  RouteDecisionResult,
  RouteRequest,
} from "@/lib/types/fx-routing";

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

export async function getReplayHistory(limit = 12): Promise<ReplayHistoryItem[]> {
  const page = await getReplayHistoryPage({ page: 1, pageSize: limit });
  return page.items;
}

export async function getReplayHistoryPage(params?: {
  page?: number;
  pageSize?: number;
}): Promise<ReplayHistoryPage> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params?.pageSize ?? 12));

  const [totalItems, rows] = await Promise.all([
    prisma.transaction.count(),
    prisma.transaction.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        amount: true,
        sourceCurrency: true,
        destinationCurrency: true,
        priority: true,
        maxTime: true,
        maxFeePercent: true,
        whatIfShockPercent: true,
        selectedRailCode: true,
        totalCostSource: true,
        settlementTimeHours: true,
        anomalyFlag: true,
      },
    }),
  ]);

  const items = rows.map((row: {
    id: string;
    createdAt: Date;
    amount: unknown;
    sourceCurrency: string;
    destinationCurrency: string;
    priority: string;
    maxTime: number | null;
    maxFeePercent: unknown | null;
    whatIfShockPercent: unknown | null;
    selectedRailCode: string;
    totalCostSource: unknown;
    settlementTimeHours: unknown;
    anomalyFlag: boolean;
  }) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    amount: Number(row.amount),
    sourceCurrency: row.sourceCurrency,
    destinationCurrency: row.destinationCurrency,
    priority: row.priority as RouteRequest["priority"],
    maxTime: row.maxTime ?? undefined,
    maxFeePercent: row.maxFeePercent ? Number(row.maxFeePercent) : undefined,
    whatIfShockPercent: row.whatIfShockPercent ? Number(row.whatIfShockPercent) : undefined,
    selectedRailCode: row.selectedRailCode,
    totalCostSource: Number(row.totalCostSource),
    settlementTimeHours: Number(row.settlementTimeHours),
    anomalyFlag: row.anomalyFlag,
  }));

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages,
  };
}

export async function getReplayRequestById(id: string): Promise<RouteRequest | null> {
  const row = await prisma.transaction.findUnique({
    where: { id },
    select: {
      amount: true,
      sourceCurrency: true,
      destinationCurrency: true,
      priority: true,
      maxTime: true,
      maxFeePercent: true,
      whatIfShockPercent: true,
    },
  });

  if (!row) {
    return null;
  }

  return {
    amount: Number(row.amount),
    sourceCurrency: row.sourceCurrency,
    destinationCurrency: row.destinationCurrency,
    priority: row.priority as RouteRequest["priority"],
    constraints: {
      maxTime: row.maxTime ?? undefined,
      maxFeePercent: row.maxFeePercent ? Number(row.maxFeePercent) : undefined,
    },
    whatIfShockPercent: row.whatIfShockPercent ? Number(row.whatIfShockPercent) : undefined,
  };
}
