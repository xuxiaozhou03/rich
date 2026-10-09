import type { AccountSnapshot, Position } from "@quant-backtest/shared";

interface Lot {
  shares: number;
  costPerShare: number;
  date: number;
}

interface Holding {
  shares: number;
  cost: number;
  lots: Lot[];
}

/** 一次买入到卖出的往返结果，用于胜率、盈亏比、持仓天数等指标。 */
export interface RealizedTrade {
  code: string;
  entryDate: number;
  exitDate: number;
  shares: number;
  /** 匹配到的买入成本（含买入费用） */
  entryCost: number;
  /** 扣除卖出费用后的净收入 */
  exitProceeds: number;
  pnl: number;
  holdingDays: number;
}

function ymdToUtc(date: number): number {
  const year = Math.floor(date / 10000);
  const month = Math.floor((date % 10000) / 100);
  const day = date % 100;
  return Date.UTC(year, month - 1, day);
}

/** 两个 YYYYMMDD 之间的自然日差。 */
export function daysBetween(from: number, to: number): number {
  return Math.round((ymdToUtc(to) - ymdToUtc(from)) / 86_400_000);
}

/**
 * 账户：现金 + 持仓。持仓按 FIFO 批次记录，卖出时逐批匹配，
 * 从而得到往返盈亏与持仓天数。
 */
export class Account {
  cash: number;
  readonly realized: RealizedTrade[] = [];
  private readonly holdings = new Map<string, Holding>();

  constructor(initCash: number) {
    this.cash = initCash;
  }

  get codes(): string[] {
    return [...this.holdings.keys()];
  }

  shares(code: string): number {
    return this.holdings.get(code)?.shares ?? 0;
  }

  buy(code: string, shares: number, price: number, fee: number, date: number): void {
    if (shares <= 0) return;
    const cost = shares * price + fee;
    this.cash -= cost;
    const holding = this.holdings.get(code) ?? { shares: 0, cost: 0, lots: [] };
    holding.shares += shares;
    holding.cost += cost;
    holding.lots.push({ shares, costPerShare: cost / shares, date });
    this.holdings.set(code, holding);
  }

  sell(code: string, shares: number, price: number, fee: number, date: number): void {
    const holding = this.holdings.get(code);
    if (!holding || shares <= 0) return;
    const sellShares = Math.min(shares, holding.shares);
    const netProceeds = sellShares * price - fee;
    this.cash += netProceeds;

    let remaining = sellShares;
    let matchedCost = 0;
    let entryDate = date;
    while (remaining > 1e-9 && holding.lots.length > 0) {
      const lot = holding.lots[0];
      const take = Math.min(remaining, lot.shares);
      matchedCost += take * lot.costPerShare;
      entryDate = lot.date;
      lot.shares -= take;
      remaining -= take;
      if (lot.shares <= 1e-9) holding.lots.shift();
    }

    holding.shares -= sellShares;
    holding.cost -= matchedCost;
    if (holding.shares <= 1e-9) this.holdings.delete(code);

    this.realized.push({
      code,
      entryDate,
      exitDate: date,
      shares: sellShares,
      entryCost: matchedCost,
      exitProceeds: netProceeds,
      pnl: netProceeds - matchedCost,
      holdingDays: daysBetween(entryDate, date),
    });
  }

  marketValue(priceOf: (code: string) => number | undefined): number {
    let value = 0;
    for (const [code, holding] of this.holdings) {
      const price = priceOf(code);
      if (price === undefined) continue;
      value += holding.shares * price;
    }
    return value;
  }

  totalValue(priceOf: (code: string) => number | undefined): number {
    return this.cash + this.marketValue(priceOf);
  }

  snapshot(priceOf: (code: string) => number | undefined): AccountSnapshot {
    const totalValue = this.totalValue(priceOf);
    const positions: Record<string, Position> = {};
    for (const [code, holding] of this.holdings) {
      const price = priceOf(code);
      const marketValue = price === undefined ? 0 : holding.shares * price;
      positions[code] = {
        code,
        shares: holding.shares,
        cost: holding.shares > 0 ? holding.cost / holding.shares : 0,
        marketValue,
        weight: totalValue > 0 ? marketValue / totalValue : 0,
      };
    }
    return { cash: this.cash, positions, totalValue };
  }

  shareMap(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [code, holding] of this.holdings) out[code] = holding.shares;
    return out;
  }
}
