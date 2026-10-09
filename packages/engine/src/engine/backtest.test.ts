import assert from "node:assert/strict";
import { test } from "node:test";

import type { KlineRow, StrategyMeta } from "@quant-backtest/shared";

import { buildMarketData } from "../data/marketData";
import { createConfig, runBacktest } from "./backtest";

function kline(date: number, close: number): KlineRow {
  return {
    code: "A",
    date,
    preClose: close,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
    amount: close,
    change: 0,
    changePercent: 0,
    source: "test",
  };
}

const buyAndHold: StrategyMeta = {
  id: "buy-hold",
  name: "Buy & Hold",
  description: "满仓持有",
  defaultParams: {},
  fn: () => ({ A: 1 }),
};

test("buy & hold 全程持币、净值随价格变化、快照哈希稳定", () => {
  const market = buildMarketData(
    [
      {
        code: "A",
        klines: [kline(20240102, 10), kline(20240103, 10), kline(20240104, 11), kline(20240105, 12)],
        factors: [],
      },
    ],
    20240105,
    ["A"],
    "test",
  );
  const config = createConfig({
    startDate: 20240102,
    endDate: 20240105,
    universe: { mode: "fixed", codes: ["A"] },
    initCash: 1_000_000,
  });

  const result = runBacktest(config, buyAndHold, market);

  assert.equal(result.equity.length, 4);
  assert.equal(result.equity[0].date, 20240102);
  assert.ok(result.trades.length >= 1);
  assert.equal(result.trades[0].side, "buy");
  assert.ok(result.metrics.totalReturn > 0.19);
  assert.equal(result.adjustBaseDate, 20240105);
  assert.equal(result.adjustSnapshotHash.length, 64);
  assert.equal(result.dataVersion, "test");

  const again = runBacktest(config, buyAndHold, market);
  assert.equal(again.adjustSnapshotHash, result.adjustSnapshotHash);
  assert.ok(Math.abs(again.metrics.totalReturn - result.metrics.totalReturn) < 1e-12);
});
