import { prisma } from "@quant-backtest/db";

import { fetchEtfs } from "../etfs/fetchEtfs";
import { fetchHoldAllFund } from "../holdAll/fetch";
import { fetchDayKv2 } from "../klines/dayKV2";
import {
  buildSubscribeShareKlines,
  parseSubscribeShareRows,
} from "../klines/parsers";
import { fetchSubscribeShare } from "../klines/subscribeShare";
import type { KlineRecord } from "../klines/types";
import { fetchLinkFund } from "../linkFund/fetch";
import {
  dataResult,
  emptyResult,
  errorResult,
  isRecord,
} from "../utils/fetchResult";
import {
  getLatestDayKv2Date,
  persistDayKv2,
  persistEtfs,
  persistHoldings,
  persistLinkEtfs,
  persistSubscribeKlines,
  persistSubscribeShareSnapshot,
} from "./persist";
import { taskPolicies } from "./policies";
import { runSyncTask, type SyncRunResult } from "./runSyncTask";

export async function syncEtfs(
  force = false,
): Promise<SyncRunResult> {
  return runSyncTask({
    taskKey: "etf_list",
    ...taskPolicies.etfList,
    force,
    execute: fetchEtfs,
    persist: persistEtfs,
  });
}

export async function getEtfCodes(): Promise<string[]> {
  const rows = await prisma.etf.findMany({
    select: { code: true },
    orderBy: { code: "asc" },
  });
  return rows.map((row) => row.code);
}

export async function syncLinkFund(
  code: string,
  force = false,
): Promise<SyncRunResult> {
  return runSyncTask({
    taskKey: `link_fund:${code}`,
    ...taskPolicies.linkFund,
    force,
    execute: () => fetchLinkFund(code),
    persist: (records) => persistLinkEtfs(code, records),
  });
}

export async function syncHoldAll(
  code: string,
  force = false,
): Promise<SyncRunResult> {
  return runSyncTask({
    taskKey: `hold_all:${code}`,
    ...taskPolicies.holdAll,
    force,
    execute: () => fetchHoldAllFund(code),
    persist: (records) => persistHoldings(code, records),
  });
}

async function syncDayKv2(
  code: string,
  force: boolean,
): Promise<SyncRunResult> {
  return runSyncTask({
    taskKey: `day_kv2:${code}`,
    ...taskPolicies.dayKv2,
    force,
    execute: () => fetchDayKv2(code),
    persist: persistDayKv2,
  });
}

async function syncSubscribeShareSnapshot(
  code: string,
  force: boolean,
): Promise<SyncRunResult> {
  return runSyncTask({
    taskKey: `subscribe_share:${code}`,
    ...taskPolicies.subscribeShare,
    force,
    execute: () => fetchSubscribeShare(code),
    persist: persistSubscribeShareSnapshot,
  });
}

async function syncKlineCalculation(
  code: string,
  force: boolean,
): Promise<SyncRunResult> {
  interface CalculatedKlineBatch {
    records: KlineRecord[];
    snapshotId: string;
    dayKv2LatestDate: number | null;
  }

  return runSyncTask<CalculatedKlineBatch>({
    taskKey: `kline_calc:${code}`,
    ...taskPolicies.klineCalculation,
    force,
    execute: async () => {
      const snapshot = await prisma.subscribeShareSnapshot.findFirst({
        where: { code },
        orderBy: { latestDate: "desc" },
      });
      if (!snapshot) {
        return emptyResult("没有 subscribeShare 原始快照");
      }

      const dayKv2LatestDate = await getLatestDayKv2Date(code);
      if (
        dayKv2LatestDate !== null &&
        snapshot.latestDate <= dayKv2LatestDate
      ) {
        return {
          kind: "skipped",
          reason: "covered_by_day_kv2",
          raw: {
            subscribeShareLatestDate: snapshot.latestDate,
            dayKv2LatestDate,
          },
        };
      }

      let payload: unknown;
      try {
        payload = JSON.parse(snapshot.payload) as unknown;
      } catch {
        return errorResult(
          "schema",
          "数据库中的 subscribeShare 快照不是合法 JSON",
          false,
        );
      }

      const rows = parseSubscribeShareRows(
        Array.isArray(payload)
          ? payload
          : isRecord(payload)
            ? payload.datas
            : null,
      );
      if (!rows) {
        return errorResult(
          "schema",
          "数据库中的 subscribeShare 快照结构不正确",
          false,
        );
      }

      const records = buildSubscribeShareKlines(
        code,
        rows,
        dayKv2LatestDate,
      );
      if (records.length === 0) {
        return emptyResult(
          "没有需要从 subscribeShare 计算的 K 线",
          payload,
        );
      }

      return dataResult(
        {
          records,
          snapshotId: snapshot.id,
          dayKv2LatestDate,
        },
        payload,
      );
    },
    persist: async (data) => {
      await persistSubscribeKlines(data.records);
    },
  });
}

export interface KlineSyncResult {
  code: string;
  dayKv2: SyncRunResult;
  subscribeShare: SyncRunResult;
  calculation: SyncRunResult | null;
}

export async function syncKline(
  code: string,
  force = false,
): Promise<KlineSyncResult> {
  const dayKv2 = await syncDayKv2(code, force);
  const subscribeShare = await syncSubscribeShareSnapshot(code, force);

  if (dayKv2.status === "failed" || dayKv2.status === "empty") {
    return {
      code,
      dayKv2,
      subscribeShare,
      calculation: {
        taskKey: `kline_calc:${code}`,
        status: "skipped",
        resultCode: "day_kv2_unavailable",
      },
    };
  }

  const calculation = await syncKlineCalculation(code, force);
  return { code, dayKv2, subscribeShare, calculation };
}
