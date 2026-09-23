import { isRecord } from "../utils/fetchResult";
import type {
  DayKv2Payload,
  DayKv2Row,
  KlineRecord,
  SubscribeShareRow,
} from "./types";

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
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
    floatShares: Array.isArray(value.floatShares)
      ? (value.floatShares as Array<[number, number]>)
      : undefined,
  };
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
