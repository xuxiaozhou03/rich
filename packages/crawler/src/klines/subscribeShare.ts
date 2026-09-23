import { fetchCheeseApi } from "../utils/fetchCheeseApi";
import {
  dataResult,
  emptyResult,
  errorResult,
  type FetchResult,
} from "../utils/fetchResult";
import {
  latestSubscribeShareDate,
  parseSubscribeShareRows,
} from "./parsers";
import type { SubscribeShareRow } from "./types";

export interface SubscribeShareSnapshotData {
  code: string;
  latestDate: number;
  rows: SubscribeShareRow[];
}

export async function fetchSubscribeShare(
  code = "159502.SZ",
  days = 5,
): Promise<FetchResult<SubscribeShareSnapshotData>> {
  const response = await fetchCheeseApi<unknown>({
    timestamp: Date.now(),
    url: `https://stock.cheesefortune.com/api/v2/k/subscribeShare?code=${code}&days=${days}&isCN=true`,
    Referer: `https://stock.cheesefortune.com/security/etf/${code}?blank=true`,
  });
  if (response.kind !== "data") return response;

  const rows = parseSubscribeShareRows(response.data);
  if (!rows) {
    return errorResult("schema", "subscribeShare 返回结构不正确", false);
  }
  if (rows.length === 0) {
    return emptyResult("subscribeShare 没有数据", response.raw);
  }

  const latestDate = latestSubscribeShareDate(rows);
  if (latestDate === null) {
    return errorResult("schema", "subscribeShare 没有有效日期", false);
  }

  return dataResult({ code, latestDate, rows }, response.raw);
}
