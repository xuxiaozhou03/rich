import { getCalendar } from "market-calendar";

/**
 * 沪深两市的交易日历完全一致（同一批节假日、同样的 09:30-15:00 时段），
 * 所以统一用上交所日历 SSE（别名 XSHG），它来自 market-calendar。
 */
const calendar = getCalendar("SSE");

const SHANGHAI_ZONE = "Asia/Shanghai";
const DAY_MS = 24 * 60 * 60 * 1000;
/** 回看窗口，足够跨过春节、国庆这类长假 */
const LOOKBACK_DAYS = 45;

export interface TradingSession {
  /** 交易日，YYYYMMDD，用作 SyncTask.taskKey 的后缀 */
  key: string;
  /** 交易日，YYYY-MM-DD */
  isoDate: string;
  /** 该交易日收盘时刻（epoch ms） */
  closedAt: number;
}

/** 上海时区下的日期，YYYY-MM-DD */
export function dateInShanghai(instant: Date = new Date()): string {
  return instant.toLocaleDateString("en-CA", { timeZone: SHANGHAI_ZONE });
}

/** 某一天是不是交易日——爬虫要不要执行由它决定 */
export function isTradingDay(isoDate: string): boolean {
  return calendar.validDays(isoDate, isoDate).length > 0;
}

/**
 * 最近一个已经收盘的交易日。
 *
 * 盘中会回落到上一个交易日，只有收盘之后的第一次运行才会推进到当天，
 * 所以同一天里反复运行不会产生新的 taskKey。
 */
export function latestClosedSession(now: Date = new Date()): TradingSession {
  const today = dateInShanghai(now);
  const from = dateInShanghai(new Date(now.getTime() - LOOKBACK_DAYS * DAY_MS));
  const sessions = calendar.schedule(from, today, { tz: SHANGHAI_ZONE });
  const closed = sessions.filter(
    (session) => session.market_close.toMillis() <= now.getTime(),
  );

  const session = closed[closed.length - 1];
  if (!session) {
    throw new Error(`交易日历在 ${from} ~ ${today} 之间没有已收盘的交易日`);
  }

  const isoDate = session.date.toISODate();
  if (!isoDate) throw new Error("交易日历返回了非法日期");

  return {
    key: isoDate.replace(/-/g, ""),
    isoDate,
    closedAt: session.market_close.toMillis(),
  };
}

let cached: TradingSession | undefined;

/** 一次进程内固定同一个交易日，避免跨过收盘时刻时 taskKey 前后不一致 */
export function currentTradingSession(): TradingSession {
  if (!cached) cached = latestClosedSession();
  return cached;
}

/**
 * 上一次成功是不是已经过期——判断依据是那次运行的时间属于哪个交易日。
 *
 * 所属交易日还是当前交易日，就说明这个 success 就是本次要的结果；一旦跨过收盘、
 * 交易日推进，它对应的数据就成了上一个交易日的，必须重跑。
 */
export function isExpiredSuccess(
  runAt: Date,
  current: TradingSession = currentTradingSession(),
): boolean {
  return latestClosedSession(runAt).key !== current.key;
}
