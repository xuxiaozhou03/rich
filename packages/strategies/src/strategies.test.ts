import assert from "node:assert/strict";
import { test } from "node:test";

import type { MarketView, StrategyContext } from "@quant-backtest/shared";

import { getStrategy, strategies } from "./index";
import { meanReversionStrategy } from "./meanReversion";
import { momentumStrategy } from "./momentum";

function context(market: Partial<MarketView>, params: Record<string, unknown>): StrategyContext {
  return {
    date: 20240102,
    account: { cash: 1, positions: {}, totalValue: 1 },
    market: {
      indicator: () => [],
      return: () => NaN,
      raw: () => NaN,
      history: () => [],
      universe: () => [],
      ...market,
    },
    params,
  };
}

test("动量策略选收益率最高的前 K 只并等权", () => {
  const returns: Record<string, number> = { A: 0.1, B: 0.3, C: 0.2, D: 0.05 };
  const weights = momentumStrategy.fn(
    context(
      { return: (code) => returns[code], universe: () => ["A", "B", "C", "D"] },
      { lookback: 20, topK: 2 },
    ),
  );
  assert.deepEqual(Object.keys(weights).sort(), ["B", "C"]);
  assert.ok(Math.abs(weights.B - 0.5) < 1e-9);
  assert.ok(Math.abs(weights.C - 0.5) < 1e-9);
});

test("动量策略在没有有效数据时清仓", () => {
  const weights = momentumStrategy.fn(
    context({ return: () => NaN, universe: () => ["A"] }, { lookback: 20, topK: 2 }),
  );
  assert.deepEqual(weights, {});
});

test("均值回归只买低于均线的标的", () => {
  const series: Record<string, number[]> = {
    A: [10, 10, 10, 10, 8],
    B: [10, 10, 10, 10, 12],
  };
  const weights = meanReversionStrategy.fn(
    context(
      { indicator: (code) => series[code], universe: () => ["A", "B"] },
      { period: 5, topK: 3 },
    ),
  );
  assert.deepEqual(Object.keys(weights), ["A"]);
  assert.equal(weights.A, 1);
});

test("注册表包含全部策略且能按 id 取回", () => {
  assert.deepEqual(Object.keys(strategies).sort(), ["mean-reversion", "momentum"]);
  assert.equal(getStrategy("momentum").id, "momentum");
  assert.throws(() => getStrategy("missing"));
});
