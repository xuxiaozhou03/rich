"use server";

import { redirect } from "next/navigation";

import { createConfig, executeBacktest } from "@quant-backtest/engine";
import type { UniverseSpec } from "@quant-backtest/shared";
import { getStrategy } from "@quant-backtest/strategies";

import { toDateNumber } from "@/lib/format";

function parseUniverse(formData: FormData): UniverseSpec {
  const mode = String(formData.get("universeMode") ?? "all");
  if (mode === "index") {
    return { mode: "index", index: String(formData.get("universeIndex") ?? "").trim() };
  }
  if (mode === "scale") {
    return { mode: "scale", minScale: Number(formData.get("minScale") ?? 0) };
  }
  if (mode === "fixed") {
    const codes = String(formData.get("universeCodes") ?? "")
      .split(/[\s,，]+/)
      .filter(Boolean);
    return { mode: "fixed", codes };
  }
  return { mode: "all" };
}

export async function submitBacktest(formData: FormData): Promise<void> {
  const strategyId = String(formData.get("strategyId") ?? "");
  const strategy = getStrategy(strategyId);

  const startDate = toDateNumber(String(formData.get("startDate") ?? ""));
  const endDate = toDateNumber(String(formData.get("endDate") ?? ""));
  if (!startDate || !endDate || startDate >= endDate) {
    throw new Error("起止日期无效：需要 startDate < endDate");
  }

  const paramsRaw = String(formData.get("params") ?? "").trim();
  const params = paramsRaw ? JSON.parse(paramsRaw) : strategy.defaultParams;

  const config = createConfig({
    strategyId,
    params: params as Record<string, unknown>,
    startDate,
    endDate,
    universe: parseUniverse(formData),
    initCash: Number(formData.get("initCash") ?? 1_000_000),
    costModel: {
      commissionRate: Number(formData.get("commissionRate") ?? 0.0003),
      minCommission: Number(formData.get("minCommission") ?? 5),
      slippageBp: Number(formData.get("slippageBp") ?? 1),
      lotSize: 100,
    },
  });

  const runId = await executeBacktest({ strategy, config });
  redirect(`/runs/${runId}`);
}
