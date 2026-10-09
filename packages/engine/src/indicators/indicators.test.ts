import assert from "node:assert/strict";
import { test } from "node:test";

import { boll } from "./boll";
import { macd } from "./macd";
import { ema, sma } from "./ma";
import { rsi } from "./rsi";

test("sma 滚动均值，前 period-1 位为 NaN", () => {
  const out = sma([1, 2, 3, 4, 5], 3);
  assert.ok(Number.isNaN(out[0]));
  assert.ok(Number.isNaN(out[1]));
  assert.equal(out[2], 2);
  assert.equal(out[3], 3);
  assert.equal(out[4], 4);
});

test("ema 用前 period 个有效值做种子", () => {
  const out = ema([1, 2, 3, 4], 2);
  assert.ok(Number.isNaN(out[0]));
  assert.equal(out[1], 1.5);
  assert.ok(Math.abs(out[2] - 2.5) < 1e-9);
});

test("rsi 全涨为 100，且恒在 [0,100]", () => {
  const up = rsi([1, 2, 3, 4, 5, 6], 3);
  assert.equal(up[3], 100);
  const mixed = rsi([10, 11, 10, 12, 11, 13, 12, 14], 3);
  for (const value of mixed) {
    if (!Number.isNaN(value)) assert.ok(value >= 0 && value <= 100);
  }
});

test("macd 三线等长，histogram = macd - signal", () => {
  const values = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 4) * 5);
  const result = macd(values, 12, 26, 9);
  assert.equal(result.macd.length, values.length);
  assert.equal(result.signal.length, values.length);
  assert.equal(result.histogram.length, values.length);
  for (let i = 0; i < values.length; i++) {
    if (Number.isNaN(result.signal[i])) continue;
    assert.ok(Math.abs(result.histogram[i] - (result.macd[i] - result.signal[i])) < 1e-9);
  }
});

test("boll 上轨 >= 中轨 >= 下轨", () => {
  const values = Array.from({ length: 40 }, (_, i) => 10 + Math.cos(i / 3));
  const result = boll(values, 20, 2);
  for (let i = 19; i < values.length; i++) {
    assert.ok(result.upper[i] >= result.middle[i]);
    assert.ok(result.middle[i] >= result.lower[i]);
  }
});
