import type { Bar } from "./kline";

export interface Position {
  code: string;
  shares: number;
  /** 原始价成本均价。 */
  cost: number;
  /** 原始价市值。 */
  marketValue: number;
  /** 占总资产比例。 */
  weight: number;
}

export interface AccountSnapshot {
  cash: number;
  positions: Record<string, Position>;
  totalValue: number;
}

export interface MarketView {
  /** 到 T 日为止的前复权价序列，用于技术指标。 */
  indicator(code: string): number[];
  /** N 日收益率（后复权口径，引擎自动处理）。 */
  return(code: string, n: number): number;
  /** T 日原始价（不复权）。 */
  raw(code: string): number;
  /** T 日往前 days 根日 K（前复权 OHLCV）。 */
  history(code: string, days: number): Bar[];
  /** 当日可用标的池。 */
  universe(): string[];
}

export interface StrategyContext {
  /** 交易日 YYYYMMDD。 */
  date: number;
  account: AccountSnapshot;
  market: MarketView;
  params: Record<string, unknown>;
}

/** 目标权重：code -> 占总资产比例。未列出视为 0，空对象即全部清仓。 */
export type TargetWeights = Record<string, number>;

export type StrategyFn = (ctx: StrategyContext) => TargetWeights;

export interface StrategyMeta {
  id: string;
  name: string;
  description: string;
  defaultParams: Record<string, unknown>;
  fn: StrategyFn;
}
