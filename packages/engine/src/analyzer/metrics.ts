import type { EquityPoint, Metrics, Trade } from "@quant-backtest/shared";

import type { RealizedTrade } from "../engine/account";

export interface MetricsInput {
  equity: EquityPoint[];
  trades: Trade[];
  realized: RealizedTrade[];
  riskFreeRate: number;
  tradingDaysPerYear: number;
}

function safeDiv(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

/** 由净值曲线与交易流水计算绩效指标。 */
export function computeMetrics(input: MetricsInput): Metrics {
  const { equity, trades, realized } = input;
  const n = equity.length;
  if (n < 2) {
    throw new Error("净值序列不足两个点，无法计算绩效指标");
  }

  const nav = equity.map((point) => point.nav);
  const returns: number[] = [];
  for (let i = 1; i < n; i++) returns.push(nav[i] / nav[i - 1] - 1);

  const totalReturn = nav[n - 1] / nav[0] - 1;
  const years = (n - 1) / input.tradingDaysPerYear;
  const annualReturn = years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const annualVolatility = Math.sqrt(variance) * Math.sqrt(input.tradingDaysPerYear);
  const sharpe = safeDiv(annualReturn - input.riskFreeRate, annualVolatility);

  const downside = returns.filter((r) => r < 0);
  const downsideDeviation =
    downside.length > 0
      ? Math.sqrt(downside.reduce((a, b) => a + b * b, 0) / downside.length) *
        Math.sqrt(input.tradingDaysPerYear)
      : 0;
  const sortino = safeDiv(annualReturn - input.riskFreeRate, downsideDeviation);

  let peak = nav[0];
  let peakIndex = 0;
  let maxDrawdown = 0;
  let maxDrawdownDuration = 0;
  for (let i = 0; i < n; i++) {
    if (nav[i] >= peak) {
      peak = nav[i];
      peakIndex = i;
    } else {
      maxDrawdownDuration = Math.max(maxDrawdownDuration, i - peakIndex);
    }
    const drawdown = safeDiv(nav[i] - peak, peak);
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
  }
  const maxDrawdownMagnitude = -maxDrawdown;
  const calmar = safeDiv(annualReturn, maxDrawdownMagnitude);

  const wins = realized.filter((t) => t.pnl > 0);
  const losses = realized.filter((t) => t.pnl < 0);
  const grossProfit = wins.reduce((a, t) => a + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
  const avgWin = safeDiv(grossProfit, wins.length);
  const avgLoss = safeDiv(grossLoss, losses.length);

  const totalTraded = trades.reduce((a, t) => a + t.amount, 0);
  const avgTotalValue = equity.reduce((a, e) => a + e.totalValue, 0) / n;

  return {
    totalReturn,
    annualReturn,
    maxDrawdown: maxDrawdownMagnitude,
    maxDrawdownDuration,
    annualVolatility,
    sharpe,
    calmar,
    sortino,
    winRate: safeDiv(wins.length, realized.length),
    profitLossRatio: safeDiv(avgWin, avgLoss),
    profitFactor: safeDiv(grossProfit, grossLoss),
    turnover: safeDiv(totalTraded, avgTotalValue),
    tradeCount: trades.length,
    avgHoldingDays: safeDiv(
      realized.reduce((a, t) => a + t.holdingDays, 0),
      realized.length,
    ),
  };
}
