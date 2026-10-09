import type { CostModel } from "../types/cost";

/** 年化交易日。 */
export const TRADING_DAYS_PER_YEAR = 252;

/** 无风险利率（年化）。 */
export const DEFAULT_RISK_FREE_RATE = 0.02;

/** 基准：沪深300。 */
export const DEFAULT_BENCHMARK = "000300.SH";

/** 最小交易单位（份）。 */
export const LOT_SIZE = 100;

/** 成本模型默认值：万三佣金、最低 5 元、1bp 滑点。 */
export const DEFAULT_COST_MODEL: CostModel = {
  commissionRate: 0.0003,
  minCommission: 5,
  slippageBp: 1,
  lotSize: LOT_SIZE,
};
