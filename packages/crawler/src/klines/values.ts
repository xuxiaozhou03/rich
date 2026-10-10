import type { KlineRecord } from "./types";

export function roundToTwoDecimals(value: number, digits = 2): number {
  const rounded = Number(value.toFixed(digits));
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** change / changePercent 入库前统一保留两位小数。 */
export function normalizeKlineRecord(record: KlineRecord): KlineRecord {
  return {
    ...record,
    change: roundToTwoDecimals(record.change, 3),
    changePercent: roundToTwoDecimals(record.changePercent),
  };
}
