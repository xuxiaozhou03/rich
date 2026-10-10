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

/** 去重后的跟踪指数代码，用于抓取指数估值、行业映射等数据。 */
export async function getTrackIndexes(): Promise<string[]> {
  const rows = await prisma.etf.findMany({
    where: {
      OR: [
        { trackIndex: { endsWith: ".SH" } },
        { trackIndex: { endsWith: ".SZ" } },
        { trackIndex: { endsWith: ".CSI" } },
      ],
    },
    select: { trackIndex: true },
    orderBy: { scale: "desc" },
  });
  return Array.from(
    new Set(
      rows.flatMap((row) => (row.trackIndex === null ? [] : [row.trackIndex])),
    ),
  );
}
