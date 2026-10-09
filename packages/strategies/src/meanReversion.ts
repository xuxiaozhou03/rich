import type { StrategyMeta, TargetWeights } from "@quant-backtest/shared";

export interface MeanReversionParams {
  /** 均线周期。 */
  period: number;
  /** 最多持有几只。 */
  topK: number;
}

/** 均值回归：价格跌破 N 日均线时买入，按偏离度从大到小取前 K 只等权。 */
export const meanReversionStrategy: StrategyMeta = {
  id: "mean-reversion",
  name: "均值回归",
  description: "价格低于 N 日均线时买入，按偏离度排序取前 K 只",
  defaultParams: { period: 20, topK: 5 },
  fn: (ctx): TargetWeights => {
    const period = Number(ctx.params.period ?? 20);
    const topK = Number(ctx.params.topK ?? 5);
    const ranked = ctx.market
      .universe()
      .map((code) => {
        const series = ctx.market.indicator(code);
        if (series.length < period) return { code, deviation: NaN };
        const window = series.slice(-period);
        const mean = window.reduce((a, b) => a + b, 0) / period;
        const price = series[series.length - 1];
        return { code, deviation: mean > 0 ? (price - mean) / mean : NaN };
      })
      .filter((x) => Number.isFinite(x.deviation) && x.deviation < 0)
      .sort((a, b) => a.deviation - b.deviation)
      .slice(0, topK);

    if (ranked.length === 0) return {};
    const weight = 1 / ranked.length;
    return Object.fromEntries(ranked.map((x) => [x.code, weight]));
  },
};
