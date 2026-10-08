import { runSyncTask, type SyncRunResult } from "../utils/runSyncTask";
import { fetchHoldAllFund } from "./fetch";
import { persistHoldings } from "./persist";

export async function syncHoldAll(code: string): Promise<SyncRunResult> {
  return runSyncTask({
    taskKey: `hold_all:${code}`,
    execute: () => fetchHoldAllFund(code),
    persist: (records) => persistHoldings(code, records),
  });
}
