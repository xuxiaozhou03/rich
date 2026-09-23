import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDayKv2Klines,
  buildSubscribeShareKlines,
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
