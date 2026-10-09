import type { CostModel, TargetWeights, Trade } from "@quant-backtest/shared";

import type { Account } from "./account";

export interface ExecutionInput {
  date: number;
  weights: TargetWeights;
  account: Account;
  /** 原始收盘价（不复权）。 */
  rawPrice: (code: string) => number | undefined;
  /** 前复权收盘价（信号价）。 */
  indicatorPrice: (code: string) => number | undefined;
  costModel: CostModel;
  /** 当日是否可交易（跌停/停牌等由调用方判定）。 */
  tradable: (code: string) => boolean;
}

/** 过滤非法权重；权重和 > 1 时按比例缩放到 1。 */
export function normalizeWeights(weights: TargetWeights): TargetWeights {
  const out: TargetWeights = {};
  let sum = 0;
  for (const [code, weight] of Object.entries(weights)) {
    if (!Number.isFinite(weight) || weight <= 0) continue;
    out[code] = weight;
    sum += weight;
  }
  if (sum > 1) {
    for (const code of Object.keys(out)) out[code] /= sum;
  }
  return out;
}

/**
 * 目标权重 → 订单 → 成交。
 * 先卖后买；按 100 份取整；买入受现金约束；用原始价成交、单独扣滑点与佣金。
 */
export function executeTargetWeights(input: ExecutionInput): Trade[] {
  const { account, costModel } = input;
  const slipRate = costModel.slippageBp / 10_000;
  const lot = costModel.lotSize;
  const totalValue = account.totalValue(input.rawPrice);
  const weights = normalizeWeights(input.weights);
  const trades: Trade[] = [];

  const commissionOf = (gross: number): number =>
    gross <= 0 ? 0 : Math.max(gross * costModel.commissionRate, costModel.minCommission);

  const targetValue = new Map<string, number>();
  for (const [code, weight] of Object.entries(weights)) {
    targetValue.set(code, weight * totalValue);
  }
  // 持仓里没出现在目标中的标的 → 目标 0（清仓）。
  for (const code of account.codes) {
    if (!targetValue.has(code)) targetValue.set(code, 0);
  }

  const sells: { code: string; delta: number }[] = [];
  const buys: { code: string; delta: number }[] = [];
  for (const [code, target] of targetValue) {
    const price = input.rawPrice(code);
    if (price === undefined || price <= 0) continue;
    const delta = target - account.shares(code) * price;
    if (delta < 0) sells.push({ code, delta: -delta });
    else if (delta > 0) buys.push({ code, delta });
  }

  for (const { code, delta } of sells) {
    if (!input.tradable(code)) continue;
    const price = input.rawPrice(code);
    if (price === undefined || price <= 0) continue;
    const held = account.shares(code);
    const target = targetValue.get(code) ?? 0;
    const shares =
      target <= 0
        ? held
        : Math.min(held, Math.floor(delta / price / lot) * lot);
    if (shares <= 0) continue;

    const execPrice = price * (1 - slipRate);
    const gross = shares * price;
    const fee = commissionOf(gross);
    account.sell(code, shares, execPrice, fee, input.date);
    trades.push({
      date: input.date,
      code,
      side: "sell",
      price,
      indicatorPrice: input.indicatorPrice(code) ?? price,
      shares,
      amount: gross,
      fee,
      slippage: gross * slipRate,
      reason: target <= 0 ? "清仓" : "调仓",
    });
  }

  buys.sort((a, b) => b.delta - a.delta);
  for (const { code, delta } of buys) {
    if (!input.tradable(code)) continue;
    const price = input.rawPrice(code);
    if (price === undefined || price <= 0) continue;
    const execPrice = price * (1 + slipRate);
    let shares = Math.floor(delta / price / lot) * lot;
    while (shares > 0) {
      const fee = commissionOf(shares * price);
      if (shares * execPrice + fee <= account.cash + 1e-9) break;
      shares -= lot;
    }
    if (shares <= 0) continue;

    const gross = shares * price;
    const fee = commissionOf(gross);
    account.buy(code, shares, execPrice, fee, input.date);
    trades.push({
      date: input.date,
      code,
      side: "buy",
      price,
      indicatorPrice: input.indicatorPrice(code) ?? price,
      shares,
      amount: gross,
      fee,
      slippage: gross * slipRate,
      reason: "开仓/调仓",
    });
  }

  return trades;
}
