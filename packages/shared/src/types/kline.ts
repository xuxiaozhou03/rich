/** 日 K 一行（未复权原始价），对应 kline 表。date 为 YYYYMMDD 整数。 */
export interface KlineRow {
  code: string;
  date: number;
  preClose: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
  change: number;
  changePercent: number;
  source: string;
}

/** 复权因子阶梯的一行，factor 自 date 起生效（对应 etfAdjustFactor 表）。 */
export interface AdjustFactorStep {
  date: number;
  factor: number;
}

/** 策略可见的日 K：只保留常用字段。 */
export interface Bar {
  date: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** 三态价格：原始价 / 前复权 / 后复权。 */
export type PriceKind = "raw" | "pre" | "post";
