import { prisma } from "@quant-backtest/db";
import { buildPriceSeries } from "@quant-backtest/engine";
import type { KlineRow } from "@quant-backtest/shared";

import { formatDate, toDateNumber } from "./format";

export type KlinePeriod =
  | "timeline"
  | "timeline5"
  | "1"
  | "5"
  | "15"
  | "30"
  | "60"
  | "daily"
  | "weekly"
  | "monthly";

export type KlineAdjust = "" | "qfq" | "hfq";

export interface KlineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
  change: number;
  changePercent: number;
}

export interface KlineQuery {
  code: string;
  period: KlinePeriod;
  adjust: KlineAdjust;
  before?: string | number;
  after?: string | number;
  limit?: number;
}

/** 只有日 K 数据，这几个周期直接返回空。 */
const MINUTE_PERIODS = new Set<KlinePeriod>([
  "timeline",
  "timeline5",
  "1",
  "5",
  "15",
  "30",
  "60",
]);

function isoWeekKey(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** 日 K 聚合为周 K / 月 K：首开、最高、最低、末收，量额累加。 */
function aggregate(rows: KlineData[], period: "weekly" | "monthly"): KlineData[] {
  const buckets = new Map<string, KlineData[]>();
  for (const row of rows) {
    const [year, month, day] = row.date.split("-").map(Number);
    const key =
      period === "monthly" ? `${year}-${month}` : isoWeekKey(year, month, day);
    const list = buckets.get(key);
    if (list) list.push(row);
    else buckets.set(key, [row]);
  }

  const out: KlineData[] = [];
  let prevClose: number | null = null;
  for (const list of buckets.values()) {
    const first = list[0];
    const last = list[list.length - 1];
    const close = last.close;
    const change = close !== null && prevClose !== null ? close - prevClose : 0;
    const changePercent =
      close !== null && prevClose !== null && prevClose !== 0
        ? (close / prevClose - 1) * 100
        : 0;
    out.push({
      date: last.date,
      open: first.open,
      high: Math.max(...list.map((row) => row.high ?? Number.NEGATIVE_INFINITY)),
      low: Math.min(...list.map((row) => row.low ?? Number.POSITIVE_INFINITY)),
      close,
      volume: list.reduce((sum, row) => sum + (row.volume ?? 0), 0),
      amount: list.reduce((sum, row) => sum + (row.amount ?? 0), 0),
      change,
      changePercent,
    });
    if (close !== null) prevClose = close;
  }
  return out;
}

/**
 * 自有数据源：读本地 kline + etfAdjustFactor，按需给出前复权 / 后复权 / 不复权。
 * 前复权基准日取最新一根 K 线（图表口径）。
 */
export async function loadKlineSeries(query: KlineQuery): Promise<KlineData[]> {
  if (MINUTE_PERIODS.has(query.period)) return [];

  const rows = (await prisma.kline.findMany({
    where: { code: query.code },
    orderBy: { date: "asc" },
  })) as KlineRow[];
  if (rows.length === 0) return [];

  const baseDate = rows[rows.length - 1].date;
  const factorRows = await prisma.etfAdjustFactor.findMany({
    where: { code: query.code, date: { lte: baseDate } },
    orderBy: { date: "asc" },
  });

  const series = buildPriceSeries(
    rows,
    factorRows.map((row) => ({ date: row.date, factor: row.factor })),
    baseDate,
  );
  const factor =
    query.adjust === "qfq"
      ? series.preFactor
      : query.adjust === "hfq"
        ? series.postFactor
        : rows.map(() => 1);

  let data: KlineData[] = rows.map((row, index) => {
    const scale = factor[index];
    return {
      date: formatDate(row.date),
      open: row.open * scale,
      high: row.high * scale,
      low: row.low * scale,
      close: row.close * scale,
      volume: row.volume,
      amount: row.amount,
      change: row.change * scale,
      changePercent: row.changePercent,
    };
  });

  if (query.period === "weekly" || query.period === "monthly") {
    data = aggregate(data, query.period);
  }

  const hasBefore =
    query.before !== undefined && query.before !== null && query.before !== "";
  const hasAfter =
    query.after !== undefined && query.after !== null && query.after !== "";

  if (hasBefore) {
    const before = toDateNumber(String(query.before));
    data = data.filter((row) => toDateNumber(row.date) < before);
  }
  if (hasAfter) {
    const after = toDateNumber(String(query.after));
    data = data.filter((row) => toDateNumber(row.date) > after);
  }
  if (query.limit && query.limit > 0) {
    data = hasAfter ? data.slice(0, query.limit) : data.slice(-query.limit);
  }

  return data;
}
