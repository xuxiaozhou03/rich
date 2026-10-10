import { prisma } from "@quant-backtest/db";

import { upsertKlines } from "../klines/persist";
import type { KlineRecord } from "../klines/types";
import type { SubscribeShareSnapshotData } from "./types";

export async function persistSubscribeKlines(
  records: KlineRecord[],
): Promise<void> {
  await prisma.$transaction((tx) => upsertKlines(tx, records));
}

/** 每只 ETF 只保留一份快照，重复抓取直接覆盖 payload。 */
export async function persistSubscribeShareSnapshot(
  data: SubscribeShareSnapshotData,
): Promise<void> {
  const payload = JSON.stringify(data.rows);
  await prisma.subscribeShareSnapshot.upsert({
    where: { code: data.code },
    create: { code: data.code, payload },
    update: { payload },
  });
}
