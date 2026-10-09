import type { Bar, MarketView, StrategyContext } from "@quant-backtest/shared";

import type { Account } from "./account";
import type { MarketData } from "../data/marketData";

/** 最后一个日期 <= date 的下标；没有则返回 -1。 */
export function lastIndexAtOrBefore(dates: number[], date: number): number {
  let lo = 0;
  let hi = dates.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (dates[mid] <= date) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

/** T 日原始价（不复权）：停牌时取最近一个有效收盘价。 */
export function rawPriceAt(market: MarketData, code: string, date: number): number | undefined {
  const series = market.series.get(code);
  if (!series) return undefined;
  const index = lastIndexAtOrBefore(series.dates, date);
  return index >= 0 ? series.klines[index].close : undefined;
}

/** T 日前复权价（信号价）。 */
export function prePriceAt(market: MarketData, code: string, date: number): number | undefined {
  const series = market.series.get(code);
  if (!series) return undefined;
  const index = lastIndexAtOrBefore(series.dates, date);
  return index >= 0 ? series.preClose[index] : undefined;
}

/** 构造 T 日的行情视图：只暴露 date 及之前的数据。 */
export function buildMarketView(
  market: MarketData,
  date: number,
  universe: string[],
): MarketView {
  const indexCache = new Map<string, number>();
  const indexOf = (code: string): number => {
    const cached = indexCache.get(code);
    if (cached !== undefined) return cached;
    const series = market.series.get(code);
    const index = series ? lastIndexAtOrBefore(series.dates, date) : -1;
    indexCache.set(code, index);
    return index;
  };

  return {
    indicator(code: string): number[] {
      const series = market.series.get(code);
      const index = indexOf(code);
      return series && index >= 0 ? series.preClose.slice(0, index + 1) : [];
    },
    return(code: string, n: number): number {
      const series = market.series.get(code);
      const index = indexOf(code);
      if (!series || index < n || n <= 0) return NaN;
      const past = series.postClose[index - n];
      return past > 0 ? series.postClose[index] / past - 1 : NaN;
    },
    raw(code: string): number {
      const series = market.series.get(code);
      const index = indexOf(code);
      return series && index >= 0 ? series.klines[index].close : NaN;
    },
    history(code: string, days: number): Bar[] {
      const series = market.series.get(code);
      const index = indexOf(code);
      if (!series || index < 0 || days <= 0) return [];
      const start = Math.max(0, index - days + 1);
      return series.preBars.slice(start, index + 1);
    },
    universe(): string[] {
      return universe;
    },
  };
}

export function buildStrategyContext(
  account: Account,
  market: MarketData,
  date: number,
  universe: string[],
  params: Record<string, unknown>,
): StrategyContext {
  return {
    date,
    account: account.snapshot((code) => rawPriceAt(market, code, date)),
    market: buildMarketView(market, date, universe),
    params,
  };
}
