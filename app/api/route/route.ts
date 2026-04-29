import { NextResponse } from "next/server";

import { routeTransaction } from "@/lib/controllers/route-controller";
import { routeRequestSchema } from "@/lib/validations/route-request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = routeRequestSchema.parse(json);

    const result = await routeTransaction(parsed);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "Unable to process route request",
          details: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Unknown server error",
      },
      { status: 500 },
    );
  }
}
