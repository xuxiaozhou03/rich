import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_COST_MODEL } from "@quant-backtest/shared";

import { Account } from "./account";
import { executeTargetWeights, normalizeWeights } from "./execution";

test("normalizeWeights 丢弃非法权重并把和缩放到 1", () => {
  const out = normalizeWeights({ A: 0.6, B: 0.6, C: -1, D: NaN });
  assert.ok(Math.abs(out.A + out.B - 1) < 1e-9);
  assert.equal(out.C, undefined);
  assert.equal(out.D, undefined);
});

test("按目标权重买入，按 100 份取整且不超出现金", () => {
  const account = new Account(100_000);
  const trades = executeTargetWeights({
    date: 20240102,
    weights: { A: 0.5 },
    account,
    rawPrice: () => 10,
    indicatorPrice: () => 10,
    costModel: DEFAULT_COST_MODEL,
    tradable: () => true,
  });

  assert.equal(trades.length, 1);
  assert.equal(trades[0].side, "buy");
  assert.equal(trades[0].shares % 100, 0);
  assert.equal(account.shares("A"), trades[0].shares);
  assert.ok(account.cash >= 0);
  assert.ok(account.marketValue(() => 10) <= 50_000);
});

test("空权重时清仓", () => {
  const account = new Account(100_000);
  executeTargetWeights({
    date: 20240102,
    weights: { A: 1 },
    account,
    rawPrice: () => 10,
    indicatorPrice: () => 10,
    costModel: DEFAULT_COST_MODEL,
    tradable: () => true,
  });
  assert.ok(account.shares("A") > 0);

  const trades = executeTargetWeights({
    date: 20240103,
    weights: {},
    account,
    rawPrice: () => 10,
    indicatorPrice: () => 10,
    costModel: DEFAULT_COST_MODEL,
    tradable: () => true,
  });

  assert.equal(trades.length, 1);
  assert.equal(trades[0].side, "sell");
  assert.equal(account.shares("A"), 0);
  assert.equal(account.realized.length, 1);
});

test("不可交易的标的跳过成交", () => {
  const account = new Account(100_000);
  const trades = executeTargetWeights({
    date: 20240102,
    weights: { A: 1 },
    account,
    rawPrice: () => 10,
    indicatorPrice: () => 10,
    costModel: DEFAULT_COST_MODEL,
    tradable: () => false,
  });
  assert.equal(trades.length, 0);
  assert.equal(account.cash, 100_000);
});
