export type DayKv2Row = [
  number,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
];

/** [日期, 复权因子]。factor 自该日期起生效，后复权价 = 原始价 * factor。 */
export type DayKv2FactorRow = [number, number];

/** [日期, 份额]。 */
export type DayKv2FloatShareRow = [number, number];

export type SubscribeShareRow = [
  string | number,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
];

export interface DayKv2Payload {
  list: DayKv2Row[];
  /** 稀疏的复权因子阶梯，只在上市首日与除权除息日出现。 */
  factors: DayKv2FactorRow[];
  /** 每日份额，缺失日期不会补点。 */
  floatShares: DayKv2FloatShareRow[];
}

/** 复权因子记录，仅在除权除息日产生一行。 */
export interface AdjustFactorRecord {
  code: string;
  date: number;
  factor: number;
}

/** 份额记录。 */
export interface FloatShareRecord {
  code: string;
  date: number;
  shares: number;
}

/** dayKV2 一次拉取得到的全部内容。 */
export interface DayKv2Data {
  klines: KlineRecord[];
  factors: AdjustFactorRecord[];
  floatShares: FloatShareRecord[];
}

export interface KlineRecord {
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
  source: "day_kv2" | "subscribe_share";
}
