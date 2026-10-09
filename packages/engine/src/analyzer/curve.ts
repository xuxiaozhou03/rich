import type { EquityPoint } from "@quant-backtest/shared";

/** 每一期的简单收益率。 */
export function dailyReturns(equity: EquityPoint[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    out.push(equity[i].nav / equity[i - 1].nav - 1);
  }
  return out;
}

/** 以首个净值为基准归一化到 1。 */
export function normalizeNav(equity: EquityPoint[]): number[] {
  if (equity.length === 0) return [];
  const base = equity[0].nav;
  return equity.map((point) => point.nav / base);
}

/** 相对基准（同为归一化净值）的超额收益序列。 */
export function excessReturns(nav: number[], benchmarkNav: number[]): number[] {
  const length = Math.min(nav.length, benchmarkNav.length);
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    out.push(nav[i] - benchmarkNav[i]);
  }
  return out;
}
