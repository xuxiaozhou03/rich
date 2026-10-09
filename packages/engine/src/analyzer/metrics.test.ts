import assert from "node:assert/strict";
import { test } from "node:test";

import type { EquityPoint } from "@quant-backtest/shared";

import { computeMetrics } from "./metrics";

function point(nav: number, totalValue: number): EquityPoint {
  return {
    date: 20240102,
    cash: 0,
    marketValue: totalValue,
    totalValue,
    nav,
    drawdown: 0,
    positions: {},
  };
}

test("总收益与最大回撤", () => {
  const equity = [point(1, 100), point(1.1, 110), point(0.9, 90), point(1.2, 120)];
  const metrics = computeMetrics({
    equity,
    trades: [],
    realized: [],
    riskFreeRate: 0.02,
    tradingDaysPerYear: 252,
  });

  assert.ok(Math.abs(metrics.totalReturn - 0.2) < 1e-9);
  // 峰值 1.1 跌到 0.9，回撤 0.2/1.1 ≈ 0.1818
  assert.ok(Math.abs(metrics.maxDrawdown - (0.2 / 1.1)) < 1e-9);
  assert.equal(metrics.tradeCount, 0);
  assert.equal(metrics.winRate, 0);
});

test("净值点不足两个时抛错", () => {
  assert.throws(() =>
    computeMetrics({
      equity: [point(1, 100)],
      trades: [],
      realized: [],
      riskFreeRate: 0.02,
      tradingDaysPerYear: 252,
    }),
  );
});
