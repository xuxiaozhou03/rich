import { isRecord } from "../utils/fetchResult";
import type { PepbMetric, PepbPoint, PepbType } from "./types";

function isNullableFiniteNumber(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function parseDate(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{8}$/.test(value)) return null;
  const date = Number(value);
  return Number.isFinite(date) ? date : null;
}

function parsePoint(value: unknown): PepbPoint | null {
  if (!isRecord(value)) return null;

  const date = parseDate(value.x);
  const pointValue = value.y;
  const percentile =
    value.p === undefined
      ? null
      : isNullableFiniteNumber(value.p)
        ? value.p
        : undefined;

  if (
    date === null ||
    typeof pointValue !== "number" ||
    !Number.isFinite(pointValue) ||
    percentile === undefined
  ) {
    return null;
  }

  return { date, value: pointValue, percentile };
}

function readNullableNumber(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return null;
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * 解析单个 pepb 指标响应。
 *
 * pe / pb / psTtm 带历史分位 p；indexGZPer 只有日期和值。
 * 非法点会被丢弃，同一天重复出现时以最后一条为准。
 */
export function parsePepbMetric(
  type: PepbType,
  value: unknown,
): PepbMetric | null {
  if (!isRecord(value) || !Array.isArray(value.datas)) return null;

  const min = readNullableNumber(value.min);
  const max = readNullableNumber(value.max);
  const mid = readNullableNumber(value.mid);
  if (min === undefined || max === undefined || mid === undefined) {
    return null;
  }

  const byDate = new Map<number, PepbPoint>();
  for (const row of value.datas) {
    const point = parsePoint(row);
    if (!point) continue;
    byDate.set(point.date, point);
  }

  return {
    type,
    min,
    max,
    mid,
    points: [...byDate.values()].sort((a, b) => a.date - b.date),
  };
}
