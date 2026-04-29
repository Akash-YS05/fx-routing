-- CreateTable
CREATE TABLE "public"."Rail" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flatFee" DECIMAL(12,4) NOT NULL,
    "percentFee" DECIMAL(8,6) NOT NULL,
    "fxMarkup" DECIMAL(8,6) NOT NULL,
    "avgSettlementTimeHours" DECIMAL(8,2) NOT NULL,
    "reliabilityScore" DECIMAL(5,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "sourceCurrency" TEXT NOT NULL,
    "destinationCurrency" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "maxTime" INTEGER,
    "maxFeePercent" DECIMAL(8,4),
    "selectedRailCode" TEXT NOT NULL,
    "selectedRailScore" DECIMAL(10,6) NOT NULL,
    "totalCostSource" DECIMAL(14,4) NOT NULL,
    "settlementTimeHours" DECIMAL(10,2) NOT NULL,
    "explanation" TEXT NOT NULL,
    "comparisonPayload" JSONB NOT NULL,
    "whatIfShockPercent" DECIMAL(6,3),
    "anomalyFlag" BOOLEAN NOT NULL DEFAULT false,
    "platformMarginSource" DECIMAL(14,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "railId" TEXT NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FxRate" (
    "id" TEXT NOT NULL,
    "pair" TEXT NOT NULL,
    "baseRate" DECIMAL(14,6) NOT NULL,
    "lastFluctuatedRate" DECIMAL(14,6) NOT NULL,
    "sourceCurrency" TEXT NOT NULL,
    "destinationCurrency" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FxRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rail_code_key" ON "public"."Rail"("code");

-- CreateIndex
CREATE INDEX "Rail_isActive_idx" ON "public"."Rail"("isActive");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "public"."Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_selectedRailCode_idx" ON "public"."Transaction"("selectedRailCode");

-- CreateIndex
CREATE UNIQUE INDEX "FxRate_pair_key" ON "public"."FxRate"("pair");

-- CreateIndex
CREATE INDEX "FxRate_expiresAt_idx" ON "public"."FxRate"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_railId_fkey" FOREIGN KEY ("railId") REFERENCES "public"."Rail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
