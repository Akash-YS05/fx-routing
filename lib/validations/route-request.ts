import { z } from "zod";

import { DEFAULT_DESTINATION_CURRENCY } from "@/lib/constants/fx";

export const routeRequestSchema = z.object({
  amount: z.number().positive().max(10_000_000),
  sourceCurrency: z.string().length(3).toUpperCase(),
  destinationCurrency: z.string().length(3).toUpperCase().default(DEFAULT_DESTINATION_CURRENCY),
  priority: z.enum(["cheap", "fast", "balanced"]),
  constraints: z
    .object({
      maxTime: z.number().positive().max(240).optional(),
      maxFeePercent: z.number().positive().max(20).optional(),
    })
    .optional(),
  whatIfShockPercent: z.number().min(-20).max(20).optional(),
});

export type RouteRequestInput = z.infer<typeof routeRequestSchema>;
