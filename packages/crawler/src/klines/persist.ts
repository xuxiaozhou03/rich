import { Prisma, prisma } from "@quant-backtest/db";

import type {
  AdjustFactorRecord,
  DayKv2Data,
  FloatShareRecord,
  KlineRecord,
} from "./types";

type TransactionClient = Prisma.TransactionClient;

/** createMany 单批行数上限，避免超出 SQLite 的绑定参数上限。 */
const CREATE_MANY_CHUNK = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function sameNumber(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-10;
}

function sameKline(
  existing: {
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
  },
  incoming: KlineRecord,
): boolean {
  return (
    existing.source === incoming.source &&
    sameNumber(existing.preClose, incoming.preClose) &&
    sameNumber(existing.open, incoming.open) &&
    sameNumber(existing.high, incoming.high) &&
    sameNumber(existing.low, incoming.low) &&
    sameNumber(existing.close, incoming.close) &&
    sameNumber(existing.volume, incoming.volume) &&
    sameNumber(existing.amount, incoming.amount) &&
    sameNumber(existing.change, incoming.change) &&
    sameNumber(existing.changePercent, incoming.changePercent)
  );
}

/** dayKV2 是权威日 K：比 subscribeShare 聚合出来的行优先。 */
export async function upsertKlines(
  tx: TransactionClient,
  records: KlineRecord[],
): Promise<void> {
  for (const record of records) {
    const existing = await tx.kline.findUnique({
      where: {
        code_date: {
          code: record.code,
          date: record.date,
        },
      },
    });

    if (
      existing?.source === "day_kv2" &&
      record.source === "subscribe_share"
    ) {
      continue;
    }
    if (existing && sameKline(existing, record)) continue;

    await tx.kline.upsert({
      where: {
        code_date: {
          code: record.code,
          date: record.date,
        },
      },
      create: record,
      update: {
        preClose: record.preClose,
        open: record.open,
        high: record.high,
        low: record.low,
        close: record.close,
        volume: record.volume,
        amount: record.amount,
        change: record.change,
        changePercent: record.changePercent,
        source: record.source,
      },
    });
  }
}

/**
 * dayKV2 每次返回全量历史，因此复权因子与份额按标的整体替换。
 * 接口未返回对应数组时保留库中已有数据，避免把好数据清空。
 */
async function replaceAdjustFactors(
  tx: TransactionClient,
  code: string,
  records: AdjustFactorRecord[],
): Promise<void> {
  if (records.length === 0) return;

  await tx.etfAdjustFactor.deleteMany({ where: { code } });
  for (const batch of chunk(records, CREATE_MANY_CHUNK)) {
    await tx.etfAdjustFactor.createMany({ data: batch });
  }
}

async function replaceFloatShares(
  tx: TransactionClient,
  code: string,
  records: FloatShareRecord[],
): Promise<void> {
  if (records.length === 0) return;

  await tx.etfFloatShare.deleteMany({ where: { code } });
  for (const batch of chunk(records, CREATE_MANY_CHUNK)) {
    await tx.etfFloatShare.createMany({ data: batch });
  }
}

export async function persistDayKv2(data: DayKv2Data): Promise<void> {
  const code = data.klines[0]?.code ?? data.factors[0]?.code;
  if (!code) return;

  await prisma.$transaction(async (tx) => {
    await upsertKlines(tx, data.klines);
    await replaceAdjustFactors(tx, code, data.factors);
    await replaceFloatShares(tx, code, data.floatShares);
  });
}

/** 库里 day_kv2 的最新日期，用来判断 subscribeShare 有没有更新的日期要补。 */
export async function getLatestDayKv2Date(
  code: string,
): Promise<number | null> {
  const row = await prisma.kline.findFirst({
    where: { code, source: "day_kv2" },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  return row?.date ?? null;
}

/** kline 里是否已经有某一天的日 K（任意来源），用来判断当天数据是否已存在。 */
export async function hasKlineOn(
  code: string,
  date: number,
): Promise<boolean> {
  const row = await prisma.kline.findUnique({
    where: { code_date: { code, date } },
    select: { code: true },
  });
  return row !== null;
}
