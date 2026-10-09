import type { StrategyMeta, TargetWeights } from "@quant-backtest/shared";

export interface MomentumParams {
  /** 回看窗口（交易日）。 */
  lookback: number;
  /** 选前几只等权持有。 */
  topK: number;
}

/** 动量轮动：按 N 日收益率排序，选前 K 只等权持有。 */
export const momentumStrategy: StrategyMeta = {
  id: "momentum",
  name: "动量轮动",
  description: "按 N 日收益率排序，选前 K 只等权持有",
  defaultParams: { lookback: 20, topK: 5 },
  fn: (ctx): TargetWeights => {
    const lookback = Number(ctx.params.lookback ?? 20);
    const topK = Number(ctx.params.topK ?? 5);
    const ranked = ctx.market
      .universe()
      .map((code) => ({ code, ret: ctx.market.return(code, lookback) }))
      .filter((x) => Number.isFinite(x.ret))
      .sort((a, b) => b.ret - a.ret)
      .slice(0, topK);

    if (ranked.length === 0) return {};
    const weight = 1 / ranked.length;
    return Object.fromEntries(ranked.map((x) => [x.code, weight]));
  },
};
