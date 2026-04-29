import { prisma } from "@/db/prisma";
import {
  BASE_FX_RATES,
  FX_CACHE_TTL_MINUTES,
  VOLATILITY_BPS_RANGE,
} from "@/lib/constants/fx";
import { clamp, roundTo } from "@/lib/utils/number";

export type FxRateQuote = {
  pair: string;
  baseRate: number;
  volatilityFactor: number;
  fluctuatedRate: number;
};

function buildPair(sourceCurrency: string, destinationCurrency: string): string {
  return `${sourceCurrency.toUpperCase()}_${destinationCurrency.toUpperCase()}`;
}

function getBaseRateFromStaticMap(pair: string): number {
  const directRate = BASE_FX_RATES[pair];
  if (directRate) {
    return directRate;
  }

  const [source, destination] = pair.split("_");
  const reversePair = `${destination}_${source}`;
  const reverseRate = BASE_FX_RATES[reversePair];

  if (reverseRate) {
    return roundTo(1 / reverseRate, 6);
  }

  return 1;
}

function randomVolatilityFactor(): number {
  const bps = Math.random() * (VOLATILITY_BPS_RANGE * 2) - VOLATILITY_BPS_RANGE;
  return roundTo(bps / 10_000, 6);
}

export async function getFxRateQuote(params: {
  sourceCurrency: string;
  destinationCurrency: string;
  whatIfShockPercent?: number;
}): Promise<FxRateQuote> {
  const pair = buildPair(params.sourceCurrency, params.destinationCurrency);
  const now = new Date();

  const cachedRate = await prisma.fxRate.findUnique({ where: { pair } });

  const isCacheValid = cachedRate && cachedRate.expiresAt > now;
  const baseRate = isCacheValid
    ? Number(cachedRate.baseRate)
    : getBaseRateFromStaticMap(pair);

  const volatilityFactor = randomVolatilityFactor();
  const whatIfShockFactor = clamp((params.whatIfShockPercent ?? 0) / 100, -0.20, 0.20);
  const fluctuatedRate = roundTo(baseRate * (1 + volatilityFactor + whatIfShockFactor), 6);

  // Only update DB if cache is missing or expired to prevent deadlocks in parallel simulations
  if (!isCacheValid) {
    const expiresAt = new Date(now.getTime() + FX_CACHE_TTL_MINUTES * 60_000);
    await prisma.fxRate.upsert({
      where: { pair },
      create: {
        pair,
        sourceCurrency: params.sourceCurrency.toUpperCase(),
        destinationCurrency: params.destinationCurrency.toUpperCase(),
        baseRate,
        lastFluctuatedRate: fluctuatedRate,
        expiresAt,
      },
      update: {
        baseRate,
        lastFluctuatedRate: fluctuatedRate,
        expiresAt,
      },
    });
  }

  return {
    pair,
    baseRate,
    volatilityFactor,
    fluctuatedRate,
  };
}
