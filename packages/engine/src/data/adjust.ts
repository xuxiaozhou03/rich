import type { AdjustFactorStep, Bar, KlineRow } from "@quant-backtest/shared";

/** 后复权因子在 date 的取值：取最后一条 date <= d 的阶梯，之前按 1。 */
export function postFactorAt(steps: AdjustFactorStep[], date: number): number {
  let factor = 1;
  for (const step of steps) {
    if (step.date <= date) factor = step.factor;
    else break;
  }
  return factor;
}

export interface PriceSeries {
  rawClose: number[];
  postClose: number[];
  preClose: number[];
  postFactor: number[];
  preFactor: number[];
  /** 基准日（endDate）的后复权因子 */
  basePostFactor: number;
}

/**
 * 推导三态价格。
 * 前复权因子(T) = 后复权因子(T) / 后复权因子(endDate)。
 */
export function buildPriceSeries(
  klines: KlineRow[],
  steps: AdjustFactorStep[],
  endDate: number,
): PriceSeries {
  const sorted = [...steps].sort((a, b) => a.date - b.date);
  const basePostFactor = postFactorAt(sorted, endDate);
  if (!(basePostFactor > 0)) {
    throw new Error(`基准日后复权因子非法：${basePostFactor}（endDate=${endDate}）`);
  }

  const rawClose: number[] = [];
  const postClose: number[] = [];
  const preClose: number[] = [];
  const postFactor: number[] = [];
  const preFactor: number[] = [];

  for (const k of klines) {
    const post = postFactorAt(sorted, k.date);
    const pre = post / basePostFactor;
    rawClose.push(k.close);
    postFactor.push(post);
    preFactor.push(pre);
    postClose.push(k.close * post);
    preClose.push(k.close * pre);
  }

  return { rawClose, postClose, preClose, postFactor, preFactor, basePostFactor };
}

/** 按前复权因子缩放 OHLC，得到策略可见的前复权日 K。 */
export function buildPreBars(klines: KlineRow[], preFactor: number[]): Bar[] {
  return klines.map((k, i) => {
    const f = preFactor[i];
    return {
      date: k.date,
      open: k.open * f,
      high: k.high * f,
      low: k.low * f,
      close: k.close * f,
      volume: k.volume,
    };
  });
}
