import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSubscribeShareKlines,
  latestSubscribeShareDate,
  parseSubscribeShareRows,
} from "./parsers";

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
