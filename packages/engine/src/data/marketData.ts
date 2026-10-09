import type { AdjustFactorStep, Bar, KlineRow } from "@quant-backtest/shared";

import { buildPreBars, buildPriceSeries } from "./adjust";

export interface CodeSeries {
  dates: number[];
  klines: KlineRow[];
  preClose: number[];
  postClose: number[];
  preFactor: number[];
  preBars: Bar[];
}

export interface MarketData {
  /** 交易日历（升序 YYYYMMDD），区间内所有标的 K 线日期的并集 */
  calendar: number[];
  series: Map<string, CodeSeries>;
  /** date -> 当日有 K 线（可交易）的 code 集合 */
  tradableByDate: Map<number, Set<string>>;
  universe: string[];
  dataVersion: string;
}

export interface MarketEntry {
  code: string;
  klines: KlineRow[];
  factors: AdjustFactorStep[];
}

/** 从原始 K 线与复权因子构造引擎所需的行情视图（纯函数，便于测试）。 */
export function buildMarketData(
  entries: MarketEntry[],
  endDate: number,
  universe: string[],
  dataVersion: string,
): MarketData {
  const series = new Map<string, CodeSeries>();
  const tradableByDate = new Map<number, Set<string>>();
  const calendarSet = new Set<number>();

  for (const entry of entries) {
    const klines = [...entry.klines].sort((a, b) => a.date - b.date);
    const prices = buildPriceSeries(klines, entry.factors, endDate);
    const dates = klines.map((k) => k.date);

    series.set(entry.code, {
      dates,
      klines,
      preClose: prices.preClose,
      postClose: prices.postClose,
      preFactor: prices.preFactor,
      preBars: buildPreBars(klines, prices.preFactor),
    });

    for (const date of dates) {
      calendarSet.add(date);
      let codes = tradableByDate.get(date);
      if (!codes) {
        codes = new Set<string>();
        tradableByDate.set(date, codes);
      }
      codes.add(entry.code);
    }
  }

  const calendar = [...calendarSet].sort((a, b) => a - b);
  return { calendar, series, tradableByDate, universe, dataVersion };
}
