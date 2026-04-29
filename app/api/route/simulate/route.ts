import { NextResponse } from "next/server";
import { z } from "zod";

import { simulateRouting } from "@/lib/controllers/route-controller";

const simulationSchema = z.object({
  count: z.number().int().min(1).max(5_000).default(1000),
  sourceCurrency: z.string().length(3).default("USD"),
  destinationCurrency: z.string().length(3).default("INR"),
  priority: z.enum(["cheap", "fast", "balanced"]).default("balanced"),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = simulationSchema.parse(body);

    const summary = await simulateRouting(parsed);
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "Simulation failed",
          details: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Unknown server error" }, { status: 500 });
  }
}
