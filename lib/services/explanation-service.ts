import { Priority, RailQuote } from "@/lib/types/fx-routing";

export function buildRouteExplanation(params: {
  selected: RailQuote;
  all: RailQuote[];
  priority: Priority;
}): string {
  const { selected, all, priority } = params;

  if (!all.length) {
    return `${selected.railName} is selected as the optimal route for this transaction.`;
  }

  const lowestCost = all.reduce((best, current) =>
    current.totalCostSource < best.totalCostSource ? current : best,
  );
  const fastest = all.reduce((best, current) =>
    current.estimatedSettlementTimeHours < best.estimatedSettlementTimeHours ? current : best,
  );
  const swiftCost = all.find((rail) => rail.railCode === "SWIFT")?.totalCostSource;

  const isLowestCost = selected.railCode === lowestCost?.railCode;
  const isFastest = selected.railCode === fastest?.railCode;

  let reasoning = "";
  if (priority === "cheap") {
    reasoning = isLowestCost 
      ? `This route is the most economical option available${typeof swiftCost === "number" ? `, saving you ${(swiftCost - selected.totalCostSource).toFixed(2)} compared to traditional SWIFT` : ""}.`
      : `Although ${lowestCost?.railName} is slightly cheaper, this route was selected because it offers better reliability/speed while maintaining a very low cost profile.`;
  } else if (priority === "fast") {
    reasoning = isFastest
      ? `This is the fastest possible route, reaching the destination in just ${selected.estimatedSettlementTimeHours} hours.`
      : `This route was selected as the best compromise for speed; although ${fastest?.railName} might be faster, its current cost or reliability score made it less optimal.`;
  } else {
    reasoning = "This route provides the mathematically optimal balance between transaction cost, settlement speed, and rail reliability.";
  }

  let multiHopDetails = "";
  if (selected.hops && selected.hops.length > 1) {
    const routeStr = selected.hops.map(h => h.sourceCurrency).join(" → ") + " → " + selected.hops[selected.hops.length-1].destinationCurrency;
    multiHopDetails = ` This path optimizes across multiple liquidity pools: ${routeStr}.`;
  }

  return [
    `${selected.railName} is selected as your optimal path with an efficiency score of ${((1 - selected.score) * 100).toFixed(1)}%.`,
    reasoning + multiHopDetails,
    !isLowestCost && lowestCost ? `Note: ${lowestCost.railName} is cheaper (${lowestCost.totalCostSource.toFixed(2)}) but significantly slower.` : "",
    !isFastest && fastest ? `Note: ${fastest.railName} is faster (${fastest.estimatedSettlementTimeHours}h) but more expensive.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
