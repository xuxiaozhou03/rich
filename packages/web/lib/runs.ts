import { prisma } from "@quant-backtest/db";
import type { Metrics } from "@quant-backtest/shared";

export function parseMetrics(json: string | null): Metrics | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as Metrics;
  } catch {
    return null;
  }
}

export function parseJson<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export async function listRuns(limit = 50) {
  return prisma.backtestRun.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getRun(id: string) {
  return prisma.backtestRun.findUnique({ where: { id } });
}

export async function getEquity(runId: string) {
  return prisma.backtestEquity.findMany({
    where: { runId },
    orderBy: { date: "asc" },
  });
}

export async function getTrades(runId: string) {
  return prisma.backtestTrade.findMany({
    where: { runId },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });
}
