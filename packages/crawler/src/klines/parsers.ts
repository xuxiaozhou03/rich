import { isRecord } from "../utils/fetchResult";
import type {
  AdjustFactorRecord,
  DayKv2Payload,
  DayKv2Row,
  FloatShareRecord,
  KlineRecord,
  SubscribeShareRow,
} from "./types";

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function isNumberPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1])
  );
}

/**
 * 把 [日期, 数值] 数组归一化为按日期升序、日期唯一的数组。
 * 结构不符或数值不合法的行会被丢弃；同一天重复出现时以最后一条为准。
 */
function normalizePairs(
  value: unknown,
  isValueValid: (value: number) => boolean,
): Array<[number, number]> {
  if (!Array.isArray(value)) return [];

  const byDate = new Map<number, number>();
  for (const row of value) {
    if (!isNumberPair(row)) continue;
    if (!isValueValid(row[1])) continue;
    byDate.set(row[0], row[1]);
  }

  return [...byDate.entries()].sort((a, b) => a[0] - b[0]);
}

function isSubscribeShareRow(value: unknown): value is SubscribeShareRow {
  return (
    Array.isArray(value) &&
    value.length >= 5 &&
    (typeof value[0] === "string" || typeof value[0] === "number") &&
    isNullableNumber(value[1]) &&
    isNullableNumber(value[2]) &&
    isNullableNumber(value[3]) &&
    isNullableNumber(value[4]) &&
    (value.length < 6 || isNullableNumber(value[5]))
  );
}

export function parseDayKv2Payload(value: unknown): DayKv2Payload | null {
  if (!isRecord(value) || !Array.isArray(value.list)) return null;

  const list = value.list.filter((row): row is DayKv2Row => {
    return (
      Array.isArray(row) &&
      row.length >= 8 &&
      typeof row[0] === "number" &&
      isNullableNumber(row[1]) &&
      isNullableNumber(row[2]) &&
      isNullableNumber(row[3]) &&
      isNullableNumber(row[4]) &&
      isNullableNumber(row[5]) &&
      isNullableNumber(row[6]) &&
      isNullableNumber(row[7])
    );
  });

  return {
    list,
    factors: normalizePairs(value.factors, (factor) => factor > 0),
    floatShares: normalizePairs(value.floatShares, (shares) => shares >= 0),
  };
}

export function buildAdjustFactors(
  code: string,
  payload: DayKv2Payload,
): AdjustFactorRecord[] {
  return payload.factors.map(([date, factor]) => ({ code, date, factor }));
}

export function buildFloatShares(
  code: string,
  payload: DayKv2Payload,
): FloatShareRecord[] {
  return payload.floatShares.map(([date, shares]) => ({
    code,
    date,
    shares,
  }));
}

/**
 * 取 `date` 当日生效的复权因子：因子自除权除息日起生效，早于首条记录时按 1 处理。
 */
export function factorOn(
  factors: AdjustFactorRecord[],
  date: number,
): number {
  let effective: AdjustFactorRecord | null = null;
  for (const record of factors) {
    if (record.date > date) continue;
    if (effective === null || record.date > effective.date) effective = record;
  }
  return effective?.factor ?? 1;
}

export function buildDayKv2Klines(
  code: string,
  payload: DayKv2Payload,
): KlineRecord[] {
  return payload.list.flatMap((row) => {
    const preClose = row[1];
    const close = row[5];
    if (preClose === null || close === null) return [];

    const change = close - preClose;
    return [
      {
        code,
        date: row[0],
        preClose,
        open: row[2] ?? close,
        high: row[3] ?? close,
        low: row[4] ?? close,
        close,
        volume: row[6] ?? 0,
        amount: row[7] ?? 0,
        change,
        changePercent: preClose === 0 ? 0 : (change / preClose) * 100,
        source: "day_kv2",
      },
    ];
  });
}

export function parseSubscribeShareRows(
  value: unknown,
): SubscribeShareRow[] | null {
  if (!Array.isArray(value) || !value.every(isSubscribeShareRow)) return null;
  return value;
}

function rowDate(row: SubscribeShareRow): number | null {
  const value = Number(row[0]);
  return Number.isInteger(value) ? value : null;
}

export function latestSubscribeShareDate(
  rows: SubscribeShareRow[],
): number | null {
  let latest: number | null = null;
  for (const row of rows) {
    const date = rowDate(row);
    if (date !== null && (latest === null || date > latest)) latest = date;
  }
  return latest;
}

export function buildSubscribeShareKlines(
  code: string,
  rows: SubscribeShareRow[],
  minExclusiveDate: number | null,
): KlineRecord[] {
  const grouped = new Map<number, SubscribeShareRow[]>();

  for (const row of rows) {
    const date = rowDate(row);
    if (date === null || row[1] === null) continue;
    const items = grouped.get(date) ?? [];
    items.push(row);
    grouped.set(date, items);
  }

  const dates = [...grouped.keys()].sort((a, b) => a - b);
  const result: KlineRecord[] = [];
  let previousClose: number | null = null;

  for (const date of dates) {
    const items = grouped.get(date)!;
    const prices = items
      .map((row) => row[1])
      .filter((price): price is number => price !== null);
    const close = prices[prices.length - 1];
    if (close === undefined) continue;

    const explicitPreClose = items.find((row) => row[5] !== null)?.[5] ?? null;
    const preClose = explicitPreClose ?? previousClose ?? prices[0];
    const change = close - preClose;

    if (minExclusiveDate === null || date > minExclusiveDate) {
      result.push({
        code,
        date,
        preClose,
        open: prices[0],
        high: Math.max(...prices),
        low: Math.min(...prices),
        close,
        volume: items.reduce((sum, row) => sum + (row[2] ?? 0), 0),
        amount: items.reduce((sum, row) => sum + (row[3] ?? 0), 0),
        change,
        changePercent: preClose === 0 ? 0 : (change / preClose) * 100,
        source: "subscribe_share",
      });
    }

    previousClose = close;
  }

  return result;
}
