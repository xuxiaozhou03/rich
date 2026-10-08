import { runSyncTask, type SyncRunResult } from "../utils/runSyncTask";
import { fetchLinkFund } from "./fetch";
import { persistLinkEtfs } from "./persist";

export async function syncLinkFund(code: string): Promise<SyncRunResult> {
  return runSyncTask({
    taskKey: `link_fund:${code}`,
    execute: () => fetchLinkFund(code),
    persist: (records) => persistLinkEtfs(code, records),
  });
}
