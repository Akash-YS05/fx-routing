import { DEFAULT_DESTINATION_CURRENCY } from "@/lib/constants/fx";
import { computeOptimalRoute } from "@/lib/services/decision-engine";
import {
  getReplayHistoryPage,
  getReplayRequestById,
  saveRouteSimulation,
  runSimulationBatch,
} from "@/lib/services/transaction-service";
import { ReplayHistoryPage, RouteRequest, SimulationSummary } from "@/lib/types/fx-routing";
import { RouteRequestInput } from "@/lib/validations/route-request";

function toRouteRequest(input: RouteRequestInput): RouteRequest {
  return {
    amount: input.amount,
    sourceCurrency: input.sourceCurrency.toUpperCase(),
    destinationCurrency: (input.destinationCurrency ?? DEFAULT_DESTINATION_CURRENCY).toUpperCase(),
    priority: input.priority,
    constraints: input.constraints,
    whatIfShockPercent: input.whatIfShockPercent,
  };
}

export async function routeTransaction(input: RouteRequestInput) {
  const request = toRouteRequest(input);
  const result = await computeOptimalRoute(request);
  await saveRouteSimulation(result);
  return result;
}

export async function simulateRouting(input: {
  count: number;
  sourceCurrency: string;
  destinationCurrency: string;
  priority: RouteRequest["priority"];
}): Promise<SimulationSummary> {
  return runSimulationBatch({
    count: input.count,
    sourceCurrency: input.sourceCurrency,
    destinationCurrency: input.destinationCurrency,
    priority: input.priority,
    computeRoute: computeOptimalRoute,
  });
}

export async function getRouteReplayHistoryPage(params?: {
  page?: number;
  pageSize?: number;
}): Promise<ReplayHistoryPage> {
  return getReplayHistoryPage(params);
}

export async function replayRouteDecision(transactionId: string) {
  const request = await getReplayRequestById(transactionId);

  if (!request) {
    throw new Error("Replay source transaction not found.");
  }

  const result = await computeOptimalRoute(request);
  await saveRouteSimulation(result);
  return result;
}
