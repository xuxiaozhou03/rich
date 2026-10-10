import assert from "node:assert/strict";
import test from "node:test";

import { parsePepbMetric } from "./parsers";

test("pepb parses valuation points and normalizes duplicate dates", () => {
  const metric = parsePepbMetric("pe", {
    msg: "历史：高于近五年 49.7% 的时间。",
    min: 53.95,
    max: 86.3684,
    mid: 65.0981,
    catalog: ["5Y", "10Y", "3Y"],
    datas: [
      { p: 52.3, d: 66.7474, x: "20260929", y: 66.7474 },
      { p: 58.88, d: 71.18, x: "20211011", y: 71.18 },
      { p: 49.67, d: 64.8103, x: "20260929", y: 64.8103 },
      { p: "bad", d: 1, x: "20261009", y: 1 },
    ],
    newest: {
      pb: 3.0931,
      pe: 64.8103,
      psTtm: 2.9291,
      zhgz: 41.84,
    },
  });

  assert.ok(metric);
  assert.equal(metric.type, "pe");
  assert.equal(metric.min, 53.95);
  assert.equal(metric.max, 86.3684);
  assert.equal(metric.mid, 65.0981);
  assert.deepEqual(metric.points, [
    { date: 20211011, value: 71.18, percentile: 58.88 },
    { date: 20260929, value: 64.8103, percentile: 49.67 },
  ]);
});

test("pepb accepts indexGZPer without percentile", () => {
  const metric = parsePepbMetric("indexGZPer", {
    msg: "最新综合估值分位 41.8%，估值适中。",
    catalog: ["5Y", "10Y", "3Y"],
    datas: [{ x: "20261009", y: 41.84 }],
    newest: { zhgz: 41.84, pe: 64.8103 },
  });

  assert.ok(metric);
  assert.equal(metric.min, null);
  assert.equal(metric.max, null);
  assert.equal(metric.mid, null);
  assert.deepEqual(metric.points, [
    { date: 20261009, value: 41.84, percentile: null },
  ]);
});

test("pepb rejects malformed payloads", () => {
  assert.equal(parsePepbMetric("pe", { datas: "bad" }), null);
  assert.equal(
    parsePepbMetric("pe", null),
    null,
  );
});
