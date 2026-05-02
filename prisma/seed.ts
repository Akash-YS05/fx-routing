import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rails = [
    {
      code: "SWIFT",
      name: "SWIFT (Traditional)",
      flatFee: 30,
      percentFee: 0.015,
      fxMarkup: 0.02,
      avgSettlementTimeHours: 48,
      reliabilityScore: 0.995,
      isActive: true,
    },
    {
      code: "WISE",
      name: "Wise (Mid-Market)",
      flatFee: 2,
      percentFee: 0.004,
      fxMarkup: 0.005,
      avgSettlementTimeHours: 24,
      reliabilityScore: 0.98,
      isActive: true,
    },
    {
      code: "EURO_LINK",
      name: "EuroLink SEPA",
      flatFee: 1,
      percentFee: 0.001,
      fxMarkup: 0.001,
      avgSettlementTimeHours: 4,
      reliabilityScore: 0.99,
      isActive: true,
    },
    {
      code: "INSTANT_PAY",
      name: "InstantPay Local",
      flatFee: 1,
      percentFee: 0.002,
      fxMarkup: 0.002,
      avgSettlementTimeHours: 0.5,
      reliabilityScore: 0.95,
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
