import { runSyncTask, type SyncRunResult } from "../utils/runSyncTask";
import { fetchDayKv2 } from "./fetch";
import { persistDayKv2 } from "./persist";

/** dayKV2：权威日 K，一次返回全量历史。 */
export async function syncDayKv2(code: string): Promise<SyncRunResult> {
  return runSyncTask({
    taskKey: `day_kv2:${code}`,
    execute: () => fetchDayKv2(code),
    persist: persistDayKv2,
  });
}
