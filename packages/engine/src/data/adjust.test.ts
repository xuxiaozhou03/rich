import assert from "node:assert/strict";
import { test } from "node:test";

import type { AdjustFactorStep, KlineRow } from "@quant-backtest/shared";

import { buildPriceSeries, postFactorAt } from "./adjust";

function kline(date: number, close: number): KlineRow {
  return {
    code: "T",
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

test("postFactorAt 取最后一条生效的阶梯，之前按 1", () => {
  const steps: AdjustFactorStep[] = [
    { date: 20200101, factor: 1 },
    { date: 20200601, factor: 2 },
  ];
  assert.equal(postFactorAt(steps, 20191231), 1);
  assert.equal(postFactorAt(steps, 20200531), 1);
  assert.equal(postFactorAt(steps, 20200601), 2);
  assert.equal(postFactorAt(steps, 20210101), 2);
});

test("前复权以 endDate 为基准，后复权以首日为基准", () => {
  const steps: AdjustFactorStep[] = [
    { date: 20200101, factor: 1 },
    { date: 20200601, factor: 2 },
  ];
  const klines = [kline(20200102, 10), kline(20200701, 12)];
  const series = buildPriceSeries(klines, steps, 20201231);

  assert.equal(series.basePostFactor, 2);
  assert.deepEqual(series.postFactor, [1, 2]);
  assert.deepEqual(series.postClose, [10, 24]);
  assert.deepEqual(series.preFactor, [0.5, 1]);
  assert.deepEqual(series.preClose, [5, 12]);
  assert.deepEqual(series.rawClose, [10, 12]);
});

test("基准日后复权因子非法时抛错", () => {
  const steps: AdjustFactorStep[] = [{ date: 20200101, factor: 0 }];
  assert.throws(() => buildPriceSeries([kline(20200102, 10)], steps, 20201231));
});
