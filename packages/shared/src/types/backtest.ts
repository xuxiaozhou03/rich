import type { CostModel } from "./cost";

export type UniverseSpec =
  | { mode: "all" }
  | { mode: "index"; index: string }
  | { mode: "scale"; minScale: number }
  | { mode: "fixed"; codes: string[] };

export interface BacktestConfig {
  strategyId: string;
  params: Record<string, unknown>;
  startDate: number;
  endDate: number;
  universe: UniverseSpec;
  initCash: number;
  costModel: CostModel;
  riskFreeRate: number;
  tradingDaysPerYear: number;
  benchmark?: string;
}

export interface EquityPoint {
  date: number;
  cash: number;
  marketValue: number;
  totalValue: number;
  nav: number;
  drawdown: number;
  /** code -> 持仓份额。 */
  positions: Record<string, number>;
}

export interface Trade {
  date: number;
  code: string;
  side: "buy" | "sell";
  /** 原始成交价（不复权）。 */
  price: number;
  /** 信号时看到的前复权价。 */
  indicatorPrice: number;
  shares: number;
  amount: number;
  fee: number;
  slippage: number;
  reason: string;
}

export interface Metrics {
  totalReturn: number;
  annualReturn: number;
  maxDrawdown: number;
  /** 最大回撤持续期（交易日）。 */
  maxDrawdownDuration: number;
  annualVolatility: number;
  sharpe: number;
  calmar: number;
  sortino: number;
  winRate: number;
  profitLossRatio: number;
  profitFactor: number;
  turnover: number;
  tradeCount: number;
  /** 平均持仓天数（按已平仓的往返交易）。 */
  avgHoldingDays: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  metrics: Metrics;
  equity: EquityPoint[];
  trades: Trade[];
  /** 前复权基准日（= endDate）。 */
  adjustBaseDate: number;
  /** 前复权快照哈希，用于复现校验。 */
  adjustSnapshotHash: string;
  /** 行情数据版本标识。 */
  dataVersion: string;
}
