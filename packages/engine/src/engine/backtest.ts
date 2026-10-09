import {
  DEFAULT_BENCHMARK,
  DEFAULT_COST_MODEL,
  DEFAULT_RISK_FREE_RATE,
  TRADING_DAYS_PER_YEAR,
  type BacktestConfig,
  type BacktestResult,
  type EquityPoint,
  type StrategyMeta,
  type Trade,
} from "@quant-backtest/shared";

import { computeMetrics } from "../analyzer/metrics";
import type { MarketData } from "../data/marketData";
import { loadMarketData } from "../data/loader";
import { Account } from "./account";
import { buildStrategyContext, prePriceAt, rawPriceAt } from "./context";
import { executeTargetWeights } from "./execution";
import { buildAdjustSnapshot, hashSnapshot } from "./snapshot";

type BacktestConfigInput = Partial<BacktestConfig> &
  Pick<BacktestConfig, "startDate" | "endDate">;

/** 用默认值补全配置。 */
export function createConfig(input: BacktestConfigInput): BacktestConfig {
  return {
    strategyId: input.strategyId ?? "unknown",
    params: input.params ?? {},
    startDate: input.startDate,
    endDate: input.endDate,
    universe: input.universe ?? { mode: "all" },
    initCash: input.initCash ?? 1_000_000,
    costModel: input.costModel ?? DEFAULT_COST_MODEL,
    riskFreeRate: input.riskFreeRate ?? DEFAULT_RISK_FREE_RATE,
    tradingDaysPerYear: input.tradingDaysPerYear ?? TRADING_DAYS_PER_YEAR,
    benchmark: input.benchmark ?? DEFAULT_BENCHMARK,
  };
}

/** 在已加载的行情上跑一次回测。纯内存、无副作用，便于测试与网格复用。 */
export function runBacktest(
  config: BacktestConfig,
  strategy: StrategyMeta,
  market: MarketData,
): BacktestResult {
  const calendar = market.calendar.filter(
    (date) => date >= config.startDate && date <= config.endDate,
  );
  if (calendar.length === 0) {
    throw new Error("回测区间内没有行情数据");
  }

  const account = new Account(config.initCash);
  const equity: EquityPoint[] = [];
  const trades: Trade[] = [];
  let peak = config.initCash;

  for (const date of calendar) {
    const rawPrice = (code: string): number | undefined => rawPriceAt(market, code, date);

    const context = buildStrategyContext(account, market, date, market.universe, config.params);
    const weights = strategy.fn(context);
    const dayTrades = executeTargetWeights({
      date,
      weights,
      account,
      rawPrice,
      indicatorPrice: (code) => prePriceAt(market, code, date),
      costModel: config.costModel,
      tradable: (code) => market.tradableByDate.get(date)?.has(code) ?? false,
    });
    trades.push(...dayTrades);

    const totalValue = account.totalValue(rawPrice);
    peak = Math.max(peak, totalValue);
    equity.push({
      date,
      cash: account.cash,
      marketValue: totalValue - account.cash,
      totalValue,
      nav: totalValue / config.initCash,
      drawdown: peak > 0 ? totalValue / peak - 1 : 0,
      positions: account.shareMap(),
    });
  }

  const metrics = computeMetrics({
    equity,
    trades,
    realized: account.realized,
    riskFreeRate: config.riskFreeRate,
    tradingDaysPerYear: config.tradingDaysPerYear,
  });

  return {
    config,
    metrics,
    equity,
    trades,
    adjustBaseDate: config.endDate,
    adjustSnapshotHash: hashSnapshot(buildAdjustSnapshot(market)),
    dataVersion: market.dataVersion,
  };
}

/** 从数据库加载行情后跑一次回测。 */
export async function runBacktestFromDb(
  config: BacktestConfig,
  strategy: StrategyMeta,
): Promise<BacktestResult> {
  const market = await loadMarketData(config);
  return runBacktest(config, strategy, market);
}
