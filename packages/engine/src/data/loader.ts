import { prisma } from "@quant-backtest/db";
import type { AdjustFactorStep, BacktestConfig, KlineRow } from "@quant-backtest/shared";

import { buildMarketData, type MarketData, type MarketEntry } from "./marketData";
import { resolveUniverse, type EtfMeta } from "./universe";

/**
 * 从数据库加载行情，构造引擎视图。
 * 只读 kline / etfAdjustFactor / etf，不写任何数据。
 */
export async function loadMarketData(config: BacktestConfig): Promise<MarketData> {
  const etfs = await prisma.etf.findMany({
    select: { code: true, trackingIndex: true, scale: true },
  });
  const universe = resolveUniverse(config.universe, etfs as EtfMeta[]);
  if (universe.length === 0) {
    throw new Error("标的池为空，请检查 universe 配置");
  }

  const klineRows = (await prisma.kline.findMany({
    where: {
      code: { in: universe },
      date: { gte: config.startDate, lte: config.endDate },
    },
    orderBy: [{ code: "asc" }, { date: "asc" }],
  })) as KlineRow[];

  const factorRows = await prisma.etfAdjustFactor.findMany({
    where: { code: { in: universe }, date: { lte: config.endDate } },
    orderBy: [{ code: "asc" }, { date: "asc" }],
  });

  const groupedKlines = new Map<string, KlineRow[]>();
  for (const row of klineRows) {
    const list = groupedKlines.get(row.code);
    if (list) list.push(row);
    else groupedKlines.set(row.code, [row]);
  }

  const groupedFactors = new Map<string, AdjustFactorStep[]>();
  for (const row of factorRows) {
    const list = groupedFactors.get(row.code);
    const step = { date: row.date, factor: row.factor };
    if (list) list.push(step);
    else groupedFactors.set(row.code, [step]);
  }

  const entries: MarketEntry[] = [];
  for (const [code, klines] of groupedKlines) {
    entries.push({ code, klines, factors: groupedFactors.get(code) ?? [] });
  }

  const dataVersion = `${config.startDate}-${config.endDate}:${klineRows.length}rows`;
  return buildMarketData(entries, config.endDate, universe, dataVersion);
}
