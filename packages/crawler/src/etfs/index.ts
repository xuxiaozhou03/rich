import { prisma } from "@quant-backtest/db";
import { SyncRunResult, runSyncTask } from "../utils/runSyncTask";
import { EtfRecord, fetchEtfs } from "./fetch";

async function persistEtfs(records: EtfRecord[]): Promise<void> {
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

export async function syncEtfs(): Promise<SyncRunResult> {
  return runSyncTask({
    taskKey: "etf_list",
    execute: fetchEtfs,
    persist: persistEtfs,
  });
}
