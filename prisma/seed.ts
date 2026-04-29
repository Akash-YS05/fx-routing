import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rails = [
    {
      code: "SWIFT",
      name: "SWIFT (Traditional)",
      flatFee: 25,
      percentFee: 0.015,
      fxMarkup: 0.01,
      avgSettlementTimeHours: 48,
      reliabilityScore: 0.995,
      isActive: true,
    },
    {
      code: "LOCAL_COLLECTION",
      name: "Local Collection (Economy)",
      flatFee: 5,
      percentFee: 0.005,
      fxMarkup: 0.004,
      avgSettlementTimeHours: 36,
      reliabilityScore: 0.88,
      isActive: true,
    },
    {
      code: "PARTNER_RAIL",
      name: "Partner Rail (Instant)",
      flatFee: 15,
      percentFee: 0.012,
      fxMarkup: 0.006,
      avgSettlementTimeHours: 2,
      reliabilityScore: 0.96,
      isActive: true,
    },
  ];

  for (const rail of rails) {
    await prisma.rail.upsert({
      where: { code: rail.code },
      create: rail,
      update: rail,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
