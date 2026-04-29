import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getRouteReplayHistoryPage,
  replayRouteDecision,
} from "@/lib/controllers/route-controller";

const replayBodySchema = z.object({
  transactionId: z.string().min(1),
});

const replayQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(6),
});

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = replayQuerySchema.parse({
      page: url.searchParams.get("page") ?? 1,
      pageSize: url.searchParams.get("pageSize") ?? 6,
    });

    const historyPage = await getRouteReplayHistoryPage({
      page: parsed.page,
      pageSize: parsed.pageSize,
    });
    return NextResponse.json(historyPage, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "Unable to fetch replay history",
          details: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Unknown server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = replayBodySchema.parse(json);

    const result = await replayRouteDecision(parsed.transactionId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "Unable to replay transaction",
          details: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Unknown server error" }, { status: 500 });
  }
}
