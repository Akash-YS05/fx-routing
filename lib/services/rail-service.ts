import { prisma } from "@/db/prisma";
import { RailConfig } from "@/lib/types/fx-routing";

export async function getActiveRails(): Promise<RailConfig[]> {
  const rails = await prisma.rail.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return rails.map((rail: (typeof rails)[number]) => {
    const config: RailConfig = {
      id: rail.id,
      code: rail.code,
      name: rail.name,
      flatFee: Number(rail.flatFee),
      percentFee: Number(rail.percentFee),
      fxMarkup: Number(rail.fxMarkup),
      avgSettlementTimeHours: Number(rail.avgSettlementTimeHours),
      reliabilityScore: Number(rail.reliabilityScore),
    };

    // Simulation: Restrict some rails to specific corridors to force multi-hop
    if (rail.code === "SWIFT") {
      // SWIFT supports everything (expensive fallback)
    } else if (rail.code === "INSTANT_PAY") {
      config.supportedPairs = ["EUR_INR", "GBP_INR"]; // Removed USD_INR
    } else if (rail.code === "EURO_LINK") {
      config.supportedPairs = ["USD_EUR", "EUR_USD"]; // Strictly West-to-West
    } else if (rail.code === "WISE") {
      config.supportedPairs = ["USD_EUR", "EUR_USD"]; // Strictly West-to-West
    } else if (rail.code === "LOCAL_COLLECTION") {
      config.supportedPairs = ["GBP_INR", "EUR_INR"]; 
    }

    return config;
  });
}
