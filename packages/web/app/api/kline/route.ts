import { NextResponse, type NextRequest } from "next/server";

import {
  loadKlineSeries,
  type KlineAdjust,
  type KlinePeriod,
} from "@/lib/kline";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const symbol = params.get("symbol") ?? params.get("code");
  if (!symbol) {
    return NextResponse.json({ error: "symbol 必填" }, { status: 400 });
  }

  const period = (params.get("period") ?? "daily") as KlinePeriod;
  const adjust = (params.get("adjust") ?? "") as KlineAdjust;
  const before = params.get("before") ?? undefined;
  const after = params.get("after") ?? undefined;
  const limitParam = params.get("limit");

  try {
    const data = await loadKlineSeries({
      code: symbol,
      period,
      adjust,
      before,
      after,
      limit: limitParam ? Number(limitParam) : undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
