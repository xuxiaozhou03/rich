import { ema } from "./ma";

export interface MacdResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

/** MACD：DIF = EMA(fast) - EMA(slow)，DEA = EMA(DIF, signal)。 */
export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): MacdResult {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const macdLine = values.map((_, i) => fastEma[i] - slowEma[i]);
  const signal = ema(macdLine, signalPeriod);
  const histogram = macdLine.map((value, i) => value - signal[i]);
  return { macd: macdLine, signal, histogram };
}
