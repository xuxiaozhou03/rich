/** 交易成本模型。 */
export interface CostModel {
  /** 佣金费率（按成交额）。 */
  commissionRate: number;
  /** 单笔最低佣金。 */
  minCommission: number;
  /** 滑点，单位基点（1bp = 0.01%）。 */
  slippageBp: number;
  /** 最小交易单位（份）。 */
  lotSize: number;
}
