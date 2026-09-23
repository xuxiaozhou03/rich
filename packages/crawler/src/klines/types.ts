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
  floatShares?: Array<[number, number]>;
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
