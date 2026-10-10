import { runSyncTask, type SyncRunResult } from "../utils/runSyncTask";
import { fetchPepbMetric } from "./fetch";
import { persistPepbMetric } from "./persist";
import { PEPB_TYPES, type PepbType } from "./types";

/** 单个跟踪指数指标估值任务。 */
export async function syncPepbMetric(
  indexCode: string,
  type: PepbType,
): Promise<SyncRunResult> {
  return runSyncTask({
    taskKey: `pepb:${type}:${indexCode}`,
    execute: () => fetchPepbMetric(indexCode, type),
    persist: (metric) => persistPepbMetric(indexCode, metric),
  });
}

/** 一个指数拆成 pe / pb / psTtm / indexGZPer 四个独立任务。 */
export async function syncPepb(indexCode: string): Promise<SyncRunResult[]> {
  const results: SyncRunResult[] = [];
  for (const type of PEPB_TYPES) {
    results.push(await syncPepbMetric(indexCode, type));
  }
  return results;
}
