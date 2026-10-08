import { prisma } from "@quant-backtest/db";

import { currentTradingSession } from "../calendar/tradingCalendar";
import { runSyncTask, type SyncRunResult } from "../utils/runSyncTask";
import {
  dataResult,
  emptyResult,
  errorResult,
  isRecord,
} from "../utils/fetchResult";
import { getLatestDayKv2Date, hasKlineOn } from "../klines/persist";
import type { KlineRecord } from "../klines/types";
import { fetchSubscribeShare } from "./fetch";
import { buildSubscribeShareKlines, parseSubscribeShareRows } from "./parsers";
import {
  persistSubscribeKlines,
  persistSubscribeShareSnapshot,
} from "./persist";

export async function syncSubscribeShare(
  code: string,
): Promise<SyncRunResult> {
  return runSyncTask({
    taskKey: `subscribe_share:${code}`,
    execute: () => fetchSubscribeShare(code),
    persist: persistSubscribeShareSnapshot,
  });
}

/** 用库里 subscribeShare 的原始快照补 dayKV2 还缺的日 K。 */
export async function syncKlineCalculation(
  code: string,
): Promise<SyncRunResult> {
  interface CalculatedKlineBatch {
    records: KlineRecord[];
    snapshotId: string;
    dayKv2LatestDate: number | null;
  }

  return runSyncTask<CalculatedKlineBatch>({
    taskKey: `kline_calc:${code}`,
    execute: async () => {
      const dayKv2LatestDate = await getLatestDayKv2Date(code);

      const session = Number(currentTradingSession().key);
      // 当天（当前交易日）的日 K 已经有了，就不再从 subscribeShare 聚合。
      if (await hasKlineOn(code, session)) {
        return {
          kind: "skipped",
          reason: "current_session_exists",
          raw: { session },
        };
      }

      const snapshot = await prisma.subscribeShareSnapshot.findFirst({
        where: { code },
        orderBy: { latestDate: "desc" },
      });
      if (!snapshot) {
        return emptyResult("没有 subscribeShare 原始快照");
      }

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
