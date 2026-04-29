import { prisma } from "@/db/prisma";
import { RailConfig } from "@/lib/types/fx-routing";

export async function getActiveRails(): Promise<RailConfig[]> {
  const rails = await prisma.rail.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return rails.map((rail: (typeof rails)[number]) => ({
    id: rail.id,
    code: rail.code,
    name: rail.name,
    flatFee: Number(rail.flatFee),
    percentFee: Number(rail.percentFee),
    fxMarkup: Number(rail.fxMarkup),
    avgSettlementTimeHours: Number(rail.avgSettlementTimeHours),
    reliabilityScore: Number(rail.reliabilityScore),
  }));
}
