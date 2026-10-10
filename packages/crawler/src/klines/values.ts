import type { KlineRecord } from "./types";

export function roundToTwoDecimals(value: number): number {
  const rounded = Number(value.toFixed(2));
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** change / changePercent 入库前统一保留两位小数。 */
export function normalizeKlineRecord(record: KlineRecord): KlineRecord {
  return {
    ...record,
    change: roundToTwoDecimals(record.change),
    changePercent: roundToTwoDecimals(record.changePercent),
  };
}
