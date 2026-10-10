import assert from "node:assert/strict";
import test from "node:test";

import {
  isExpiredSuccess,
  isTradingDay,
  latestClosedSession,
} from "./tradingCalendar";

test("交易日历识别周末与节假日", () => {
  assert.equal(isTradingDay("2026-10-09"), true);
  assert.equal(isTradingDay("2026-10-10"), false);
  assert.equal(isTradingDay("2026-10-01"), false);
  assert.equal(isTradingDay("2026-09-25"), false);
});

test("盘中回落到上一交易日，收盘后推进到当天", () => {
  const beforeClose = latestClosedSession(new Date("2026-10-08T02:00:00Z"));
  assert.equal(beforeClose.isoDate, "2026-09-30");
  assert.equal(beforeClose.key, "20260930");

  const afterClose = latestClosedSession(new Date("2026-10-08T08:00:00Z"));
  assert.equal(afterClose.isoDate, "2026-10-08");
  assert.equal(afterClose.key, "20261008");
});

test("周末与节假日不会产生新的交易日", () => {
  const weekend = latestClosedSession(new Date("2026-10-10T04:00:00Z"));
  assert.equal(weekend.isoDate, "2026-10-09");

  const holiday = latestClosedSession(new Date("2026-10-01T04:00:00Z"));
  assert.equal(holiday.isoDate, "2026-09-30");
});

test("success 跨过收盘就过期", () => {
  const afterClose = latestClosedSession(new Date("2026-10-08T08:00:00Z"));

  assert.equal(
    isExpiredSuccess(new Date("2026-10-08T07:30:00Z"), afterClose),
    false,
  );
  assert.equal(
    isExpiredSuccess(new Date("2026-09-30T07:30:00Z"), afterClose),
    true,
  );
  // 盘中跑的还算上一个交易日，收盘后要重跑
  assert.equal(
    isExpiredSuccess(new Date("2026-10-08T02:00:00Z"), afterClose),
    true,
  );
});

test("非交易日按最近已收盘交易日判断是否过期", () => {
  const saturday = latestClosedSession(new Date("2026-10-10T04:00:00Z"));
  assert.equal(saturday.isoDate, "2026-10-09");

  // 周五收盘后完成的 success 仍然有效，周末无需重跑。
  assert.equal(
    isExpiredSuccess(new Date("2026-10-09T08:00:00Z"), saturday),
    false,
  );
  // 周四或周五盘中完成的 success 没覆盖周五数据，周末必须补跑。
  assert.equal(
    isExpiredSuccess(new Date("2026-10-08T08:00:00Z"), saturday),
    true,
  );
  assert.equal(
    isExpiredSuccess(new Date("2026-10-09T06:00:00Z"), saturday),
    true,
  );
});
