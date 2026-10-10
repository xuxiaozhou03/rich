import assert from "node:assert/strict";
import test from "node:test";

import { normalizeKlineRecord } from "./values";

test("kline change fields are normalized to two decimals", () => {
  const record = normalizeKlineRecord({
    code: "510300.SH",
    date: 20261009,
    preClose: 4.393,
    open: 4.421,
    high: 4.444,
    low: 4.36,
    close: 4.389,
    volume: 750872537,
    amount: 3307953960,
    change: -0.00400000000000045,
    changePercent: -0.0911369332422066,
    source: "day_kv2",
  });

  assert.equal(record.change, 0);
  assert.equal(record.changePercent, -0.09);
});
