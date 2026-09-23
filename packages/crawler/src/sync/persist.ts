import { createHash } from "node:crypto";

import {
  Prisma,
  prisma,
} from "@quant-backtest/db";

import type { EtfRecord } from "../etfs/fetchEtfs";
import type { EtfHoldingRecord } from "../holdAll/fetch";
import type { LinkEtfRecord } from "../linkFund/fetch";
import type { KlineRecord } from "../klines/types";
import type { SubscribeShareSnapshotData } from "../klines/subscribeShare";

type TransactionClient = Prisma.TransactionClient;

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

export async function persistDayKv2(records: KlineRecord[]): Promise<void> {
  await prisma.$transaction((tx) => upsertKlines(tx, records));
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
