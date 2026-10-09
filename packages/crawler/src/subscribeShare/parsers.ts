import type { KlineRecord } from "../klines/types";
import type { SubscribeShareRow } from "./types";

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
  initialPreviousClose: number | null = null,
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
  // 快照只覆盖最近若干天，窗口内最早一天没有"上一根"。
  // 用 dayKV2 最新一根的收盘价兜底，避免退化成用当天开盘价（prices[0]）当 preClose。
  let previousClose: number | null = initialPreviousClose;

  for (const date of dates) {
    const items = grouped.get(date)!;
    const prices = items
      .map((row) => row[1])
      .filter((price): price is number => price !== null);
    const close = prices[prices.length - 1];
    if (close === undefined) continue;

    // 快照第 6 列不是上一交易日的收盘价（实测常为前两日收盘或盘中价），
    // 所以只用上一个交易日的收盘价：窗口内按日推进，首日以 dayKV2 最新收盘兜底。
    const preClose = previousClose ?? prices[0];
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
