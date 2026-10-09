import { randomUUID } from "node:crypto";

import { prisma } from "@quant-backtest/db";
import type { BacktestConfig, BacktestResult, StrategyMeta } from "@quant-backtest/shared";

import { runBacktestFromDb } from "../engine/backtest";

export interface CreateRunInput {
  id: string;
  strategyId: string;
  gitCommit?: string;
  config: BacktestConfig;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 建 run 行，状态 pending。 */
export async function createRun(input: CreateRunInput): Promise<void> {
  const { config } = input;
  await prisma.backtestRun.create({
    data: {
      id: input.id,
      strategyId: input.strategyId,
      gitCommit: input.gitCommit ?? null,
      params: JSON.stringify(config.params),
      startDate: config.startDate,
      endDate: config.endDate,
      adjustBaseDate: config.endDate,
      universe: JSON.stringify(config.universe),
      initCash: config.initCash,
      costModel: JSON.stringify(config.costModel),
      adjustSnapshotHash: "",
      dataVersion: "",
      status: "pending",
    },
  });
}

export async function markRunning(runId: string): Promise<void> {
  await prisma.backtestRun.update({
    where: { id: runId },
    data: { status: "running", startedAt: new Date() },
  });
}

export async function markFailed(runId: string, message: string): Promise<void> {
  await prisma.backtestRun.update({
    where: { id: runId },
    data: { status: "failed", errorMessage: message, finishedAt: new Date() },
  });
}

/** 落库：run 汇总 + 交易流水 + 每日净值（覆盖同 run 的旧数据）。 */
export async function persistResult(runId: string, result: BacktestResult): Promise<void> {
  await prisma.$transaction([
    prisma.backtestTrade.deleteMany({ where: { runId } }),
    prisma.backtestEquity.deleteMany({ where: { runId } }),
    prisma.backtestRun.update({
      where: { id: runId },
      data: {
        status: "success",
        errorMessage: null,
        metrics: JSON.stringify(result.metrics),
        adjustSnapshotHash: result.adjustSnapshotHash,
        dataVersion: result.dataVersion,
        adjustBaseDate: result.adjustBaseDate,
        finishedAt: new Date(),
      },
    }),
    prisma.backtestTrade.createMany({
      data: result.trades.map((trade) => ({
        runId,
        date: trade.date,
        code: trade.code,
        side: trade.side,
        price: trade.price,
        indicatorPrice: trade.indicatorPrice,
        shares: trade.shares,
        amount: trade.amount,
        fee: trade.fee,
        slippage: trade.slippage,
        reason: trade.reason,
      })),
    }),
    prisma.backtestEquity.createMany({
      data: result.equity.map((point) => ({
        runId,
        date: point.date,
        cash: point.cash,
        marketValue: point.marketValue,
        totalValue: point.totalValue,
        nav: point.nav,
        drawdown: point.drawdown,
        positions: JSON.stringify(point.positions),
      })),
    }),
  ]);
}

export interface ExecuteBacktestInput {
  strategy: StrategyMeta;
  config: BacktestConfig;
  gitCommit?: string;
  /** 自定义 run id，缺省随机生成。 */
  runId?: string;
}

/** 建 run → 跑回测 → 落库；失败时记录原因。返回 runId。 */
export async function executeBacktest(input: ExecuteBacktestInput): Promise<string> {
  const runId = input.runId ?? randomUUID();
  await createRun({
    id: runId,
    strategyId: input.strategy.id,
    gitCommit: input.gitCommit,
    config: input.config,
  });
  await markRunning(runId);
  try {
    const result = await runBacktestFromDb(input.config, input.strategy);
    await persistResult(runId, result);
  } catch (error) {
    await markFailed(runId, errorMessage(error));
  }
  return runId;
}
