import { runSyncTask, type SyncRunResult } from "../utils/runSyncTask";
import { fetchSwMap } from "./fetch";
import { persistSwMap } from "./persist";

/** 跟踪指数的申万一级/二级/三级行业权重。 */
export async function syncSwMap(indexCode: string): Promise<SyncRunResult> {
  return runSyncTask({
    taskKey: `sw_map:${indexCode}`,
    execute: () => fetchSwMap(indexCode),
    persist: persistSwMap,
  });
}
