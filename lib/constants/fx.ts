import { Priority } from "@/lib/types/fx-routing";

export const BASE_FX_RATES: Record<string, number> = {
  "USD_INR": 83.2,
  "EUR_INR": 90.7,
  "GBP_INR": 105.4,
  "USD_EUR": 0.92,
  "EUR_USD": 1.08,
};

export const PRIORITY_WEIGHTS: Record<
  Priority,
  { cost: number; time: number; reliability: number }
> = {
  cheap: { cost: 0.72, time: 0.18, reliability: 0.1 },
  fast: { cost: 0.2, time: 0.65, reliability: 0.15 },
  balanced: { cost: 0.45, time: 0.35, reliability: 0.2 },
};

export const FX_CACHE_TTL_MINUTES = 3;
export const DEFAULT_DESTINATION_CURRENCY = "INR";
export const VOLATILITY_BPS_RANGE = 60;
export const ANOMALY_COST_MULTIPLIER = 1.35;
