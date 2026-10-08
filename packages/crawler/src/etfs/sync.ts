import { prisma } from "@quant-backtest/db";

import { runSyncTask, type SyncRunResult } from "../utils/runSyncTask";
import { fetchEtfs } from "./fetchEtfs";
import { persistEtfs } from "./persist";

export async function syncEtfs(): Promise<SyncRunResult> {
  return runSyncTask({
    taskKey: "etf_list",
    execute: fetchEtfs,
    persist: persistEtfs,
  });
}

export async function getEtfCodes(): Promise<string[]> {
  const rows = await prisma.etf.findMany({
    select: { code: true },
    orderBy: { scale: "desc" },
  });
  return rows.map((row) => row.code);
}
