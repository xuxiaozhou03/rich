import { prisma } from "@quant-backtest/db";

import { currentTradingSession } from "../calendar/tradingCalendar";
import { runSyncTask, type SyncRunResult } from "../utils/runSyncTask";
import {
  dataResult,
  emptyResult,
  errorResult,
} from "../utils/fetchResult";
import { getLatestDayKv2Date, hasKlineOn } from "../klines/persist";
import type { KlineRecord } from "../klines/types";
import { fetchSubscribeShare } from "./fetch";
import {
  buildSubscribeShareKlines,
  latestSubscribeShareDate,
  parseSubscribeShareRows,
} from "./parsers";
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
    dayKv2LatestDate: number | null;
  }

  return runSyncTask<CalculatedKlineBatch>({
    taskKey: `kline_calc:${code}`,
    execute: async () => {
      const dayKv2Latest = await getLatestDayKv2Date(code);
      const dayKv2LatestDate = dayKv2Latest?.date ?? null;

      const session = Number(currentTradingSession().key);
      // 当天（当前交易日）的日 K 已经有了，就不再从 subscribeShare 聚合。
      if (await hasKlineOn(code, session)) {
        return {
          kind: "skipped",
          reason: "current_session_exists",
          raw: { session },
        };
      }

      const snapshot = await prisma.subscribeShareSnapshot.findUnique({
        where: { code },
      });
      if (!snapshot) {
        return emptyResult("没有 subscribeShare 原始快照");
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

      const rows = parseSubscribeShareRows(payload);
      if (!rows) {
        return errorResult(
          "schema",
          "数据库中的 subscribeShare 快照结构不正确",
          false,
        );
      }

      const latestDate = latestSubscribeShareDate(rows);
      if (latestDate === null) {
        return errorResult(
          "schema",
          "subscribeShare 快照没有有效日期",
          false,
        );
      }

      // dayKV2 已经覆盖到快照的最后日期，没有缺口。
      if (dayKv2LatestDate !== null && latestDate <= dayKv2LatestDate) {
        return {
          kind: "skipped",
          reason: "covered_by_day_kv2",
          raw: {
            subscribeShareLatestDate: latestDate,
            dayKv2LatestDate,
          },
        };
      }

      const records = buildSubscribeShareKlines(
        code,
        rows,
        dayKv2LatestDate,
        dayKv2Latest?.close ?? null,
      );
      if (records.length === 0) {
        return emptyResult(
          "没有需要从 subscribeShare 计算的 K 线",
          payload,
        );
      }

      return dataResult({ records, dayKv2LatestDate }, payload);
    },
    persist: async (data) => {
      await persistSubscribeKlines(data.records);
    },
  });
}
