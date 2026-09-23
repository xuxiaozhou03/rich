import { createHash } from "node:crypto";

import {
  Prisma,
  prisma,
} from "@quant-backtest/db";

import type { EtfRecord } from "../etfs/fetchEtfs";
import type { EtfHoldingRecord } from "../holdAll/fetch";
import type { LinkEtfRecord } from "../linkFund/fetch";
import type {
  AdjustFactorRecord,
  DayKv2Data,
  FloatShareRecord,
  KlineRecord,
} from "../klines/types";
import type { SubscribeShareSnapshotData } from "../klines/subscribeShare";

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

async function upsertKlines(
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

export async function persistEtfs(records: EtfRecord[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const record of records) {
      await tx.etf.upsert({
        where: { code: record.code },
        create: record,
        update: {
          name: record.name,
          scale: record.scale,
          trackingIndex: record.trackingIndex,
          trackIndex: record.trackIndex,
        },
      });
    }

    await tx.etf.deleteMany({
      where: { code: { notIn: records.map((record) => record.code) } },
    });
  });
}

export async function persistLinkEtfs(
  target: string,
  records: LinkEtfRecord[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.linkEtf.deleteMany({ where: { target } });
    await tx.linkEtf.createMany({
      data: records.map((record) => ({
        target,
        source: record.code,
        similar: record.similar,
      })),
    });
  });
}

export async function persistHoldings(
  etfCode: string,
  records: EtfHoldingRecord[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.etfHolding.deleteMany({ where: { etfCode } });
    await tx.etfHolding.createMany({
      data: records.map((record) => ({
        etfCode,
        securityCode: record.securityCode,
        name: record.name,
        holdScale: record.holdScale,
      })),
    });
  });
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

export async function persistSubscribeKlines(
  records: KlineRecord[],
): Promise<void> {
  await prisma.$transaction((tx) => upsertKlines(tx, records));
}

export async function persistSubscribeShareSnapshot(
  data: SubscribeShareSnapshotData,
  raw: unknown,
): Promise<void> {
  const payload = JSON.stringify(raw ?? data.rows);
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(data.rows))
    .digest("hex");
  const now = new Date();
  const existing = await prisma.subscribeShareSnapshot.findUnique({
    where: {
      code_latestDate: {
        code: data.code,
        latestDate: data.latestDate,
      },
    },
  });

  if (!existing) {
    await prisma.subscribeShareSnapshot.create({
      data: {
        code: data.code,
        latestDate: data.latestDate,
        payload,
        payloadHash,
        firstFetchedAt: now,
        lastFetchedAt: now,
        lastSeenAt: now,
      },
    });
    return;
  }

  if (existing.payloadHash === payloadHash) {
    await prisma.subscribeShareSnapshot.update({
      where: { id: existing.id },
      data: { lastSeenAt: now },
    });
    return;
  }

  await prisma.subscribeShareSnapshot.update({
    where: { id: existing.id },
    data: {
      payload,
      payloadHash,
      lastFetchedAt: now,
      lastSeenAt: now,
    },
  });
}

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
