import { createHash } from "node:crypto";

import { prisma } from "@quant-backtest/db";

import { upsertKlines } from "../klines/persist";
import type { KlineRecord } from "../klines/types";
import type { SubscribeShareSnapshotData } from "./types";

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
