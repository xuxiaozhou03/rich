import { fetchCheeseApi } from "../utils/fetchCheeseApi";
import {
  dataResult,
  emptyResult,
  errorResult,
  type FetchResult,
} from "../utils/fetchResult";
import { obfuscateTimestamp } from "../utils/obfuscateTimestamp";
import {
  buildAdjustFactors,
  buildDayKv2Klines,
  buildFloatShares,
  parseDayKv2Payload,
} from "./parsers";
import type { DayKv2Data } from "./types";

export async function fetchDayKv2(
  code = "159502.SZ",
): Promise<FetchResult<DayKv2Data>> {
  const timestamp = Date.now();
  const response = await fetchCheeseApi<unknown>({
    timestamp,
    url: `https://stock.cheesefortune.com/api/v4/dayKV2/${code.replace(".", "")}?t=${obfuscateTimestamp(timestamp)}`,
    Referer: `https://stock.cheesefortune.com/security/etf/${code}?blank=true`,
  });
  if (response.kind !== "data") return response;

  const payload = parseDayKv2Payload(response.data);
  if (!payload) {
    return errorResult("schema", "dayKV2 返回结构不正确", false);
  }
  if (payload.list.length === 0) {
    return emptyResult("dayKV2 没有 K 线数据", response.raw);
  }

  return dataResult(
    {
      klines: buildDayKv2Klines(code, payload),
      factors: buildAdjustFactors(code, payload),
      floatShares: buildFloatShares(code, payload),
    },
    response.raw,
  );
}
