import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdjustFactors,
  buildDayKv2Klines,
  buildFloatShares,
  buildSubscribeShareKlines,
  factorOn,
  latestSubscribeShareDate,
  parseDayKv2Payload,
  parseSubscribeShareRows,
} from "./parsers";

test("dayKV2 payload maps documented array order", () => {
  const payload = parseDayKv2Payload({
    list: [[20260922, 1.5, 1.51, 1.52, 1.49, 1.505, 1000, 2000]],
  });

  assert.ok(payload);
  const [record] = buildDayKv2Klines("513050.SH", payload);
  assert.ok(record);
  assert.equal(record.code, "513050.SH");
  assert.equal(record.date, 20260922);
  assert.equal(record.preClose, 1.5);
  assert.equal(record.open, 1.51);
  assert.equal(record.high, 1.52);
  assert.equal(record.low, 1.49);
  assert.equal(record.close, 1.505);
  assert.equal(record.volume, 1000);
  assert.equal(record.amount, 2000);
  assert.ok(Math.abs(record.change - 0.005) < 1e-10);
  assert.ok(Math.abs(record.changePercent - (0.005 / 1.5) * 100) < 1e-10);
  assert.equal(record.source, "day_kv2");
});

test("subscribeShare aggregates only dates newer than dayKV2", () => {
  const rows = parseSubscribeShareRows([
    ["20260922", 1.6, 100, 200, 930, null],
    ["20260922", 1.62, 200, 400, 1500, 1.58],
    ["20260923", 1.63, 300, 600, 930, 1.62],
    ["20260923", 1.65, 400, 800, 1000, null],
    ["20260923", 1.61, 500, 1000, 1500, null],
  ]);

  assert.ok(rows);
  assert.equal(latestSubscribeShareDate(rows), 20260923);

  const records = buildSubscribeShareKlines("513050.SH", rows, 20260922);
  assert.equal(records.length, 1);
  const [record] = records;
  assert.ok(record);
  assert.equal(record.code, "513050.SH");
  assert.equal(record.date, 20260923);
  assert.equal(record.preClose, 1.62);
  assert.equal(record.open, 1.63);
  assert.equal(record.high, 1.65);
  assert.equal(record.low, 1.61);
  assert.equal(record.close, 1.61);
  assert.equal(record.volume, 1200);
  assert.equal(record.amount, 2400);
  assert.ok(Math.abs(record.change - -0.01) < 1e-10);
  assert.ok(Math.abs(record.changePercent - (-0.01 / 1.62) * 100) < 1e-10);
  assert.equal(record.source, "subscribe_share");
});

test("subscribeShare returns no records when its latest date is already covered", () => {
  const rows = parseSubscribeShareRows([
    ["20260922", 1.6, 100, 200, 930, null],
    ["20260922", 1.62, 200, 400, 1500, 1.58],
  ]);

  assert.ok(rows);
  assert.deepEqual(buildSubscribeShareKlines("513050.SH", rows, 20260922), []);
});

test("dayKV2 factors and floatShares normalize dates and drop malformed rows", () => {
  const payload = parseDayKv2Payload({
    list: [[20260922, 1.5, 1.51, 1.52, 1.49, 1.505, 1000, 2000]],
    factors: [
      [20260119, 1.267115],
      [20120528, 1],
      [20121218, 1.013924],
      [20121218, 1.02],
      [20130101, 0],
      [20260922, null],
      "bad",
    ],
    floatShares: [
      [20260922, 23713687700],
      [20260922, 23713687701],
      [20260921, 23700000000],
      [20260920, -1],
    ],
  });

  assert.ok(payload);
  assert.deepEqual(payload.factors, [
    [20120528, 1],
    [20121218, 1.02],
    [20260119, 1.267115],
  ]);
  assert.deepEqual(payload.floatShares, [
    [20260921, 23700000000],
    [20260922, 23713687701],
  ]);
});

test("dayKV2 factors and floatShares map to records keyed by code", () => {
  const payload = parseDayKv2Payload({
    list: [[20260922, 1.5, 1.51, 1.52, 1.49, 1.505, 1000, 2000]],
    factors: [[20260119, 1.267115]],
    floatShares: [[20260922, 23713687700]],
  });

  assert.ok(payload);
  assert.deepEqual(buildAdjustFactors("510300.SH", payload), [
    { code: "510300.SH", date: 20260119, factor: 1.267115 },
  ]);
  assert.deepEqual(buildFloatShares("510300.SH", payload), [
    { code: "510300.SH", date: 20260922, shares: 23713687700 },
  ]);
});

test("factorOn applies the factor from its effective date and defaults to 1", () => {
  const payload = parseDayKv2Payload({
    list: [[20260922, 1.5, 1.51, 1.52, 1.49, 1.505, 1000, 2000]],
    factors: [
      [20120528, 1],
      [20121218, 1.013924],
      [20140121, 1.036414],
    ],
  });

  assert.ok(payload);
  const factors = buildAdjustFactors("510300.SH", payload);

  assert.equal(factorOn(factors, 20120527), 1);
  assert.equal(factorOn(factors, 20120528), 1);
  assert.equal(factorOn(factors, 20121217), 1);
  assert.equal(factorOn(factors, 20121218), 1.013924);
  assert.equal(factorOn(factors, 20140120), 1.013924);
  assert.equal(factorOn(factors, 20140121), 1.036414);
  assert.equal(factorOn(factors, 20260922), 1.036414);
});

test("dayKV2 factor steps reproduce the ex-dividend price gap", () => {
  const payload = parseDayKv2Payload({
    list: [
      [20121218, 2.37, 2.372, 2.383, 2.364, 2.366, 330349200, 784145170],
      [20140121, 2.164, 2.17, 2.19, 2.151, 2.182, 434145700, 942175760],
      [20120528, 2.574, 2.551, 2.607, 2.544, 2.604, 1277518769, 3285755320],
    ],
    factors: [
      [20120528, 1],
      [20121218, 1.013924],
      [20140121, 1.036414],
    ],
  });

  assert.ok(payload);
  const factors = buildAdjustFactors("510300.SH", payload);
  const previousCloseOf = new Map([
    [20121218, 2.403],
    [20140121, 2.212],
  ]);
  const preCloseOf = new Map([
    [20121218, 2.37],
    [20140121, 2.164],
  ]);

  for (const date of [20121218, 20140121]) {
    const step = factorOn(factors, date) / factorOn(factors, date - 1);
    const gap = previousCloseOf.get(date)! / preCloseOf.get(date)!;
    assert.ok(Math.abs(step - gap) < 1e-6, `${date} 因子步长 ${step} 与除息缺口 ${gap} 不一致`);
  }
});

test("dayKV2 re-applies the factor to raw prices as 后复权", () => {
  const payload = parseDayKv2Payload({
    list: [[20260922, 4.608, 4.636, 4.658, 4.612, 4.613, 644587351, 2987237086]],
    factors: [
      [20120528, 1],
      [20260119, 1.267115],
    ],
  });

  assert.ok(payload);
  const factors = buildAdjustFactors("510300.SH", payload);
  const adjustedClose = 4.613 * factorOn(factors, 20260922);

  assert.ok(Math.abs(adjustedClose - 5.845201495) < 1e-6);
});
