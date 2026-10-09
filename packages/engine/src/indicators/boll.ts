import { sma } from "./ma";

export interface BollResult {
  middle: number[];
  upper: number[];
  lower: number[];
}

/** 布林带：中轨 = SMA(period)，上下轨 = 中轨 ± mult × 标准差。 */
export function boll(values: number[], period = 20, mult = 2): BollResult {
  const middle = sma(values, period);
  const upper = new Array<number>(values.length).fill(NaN);
  const lower = new Array<number>(values.length).fill(NaN);

  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    sumSq += values[i] * values[i];
    if (i >= period) {
      sum -= values[i - period];
      sumSq -= values[i - period] * values[i - period];
    }
    if (i >= period - 1) {
      const mean = sum / period;
      const variance = Math.max(sumSq / period - mean * mean, 0);
      const sd = Math.sqrt(variance);
      upper[i] = mean + mult * sd;
      lower[i] = mean - mult * sd;
    }
  }
  return { middle, upper, lower };
}
