import { fetchCheeseApi } from "../utils/fetchCheeseApi";
import {
  dataResult,
  emptyResult,
  errorResult,
  type FetchResult,
} from "../utils/fetchResult";
import { obfuscateTimestamp } from "../utils/obfuscateTimestamp";
import { parsePepbMetric } from "./parsers";
import type { PepbMetric, PepbType } from "./types";

export async function fetchPepbMetric(
  code: string,
  type: PepbType,
): Promise<FetchResult<PepbMetric>> {
  const timestamp = Date.now();
  const response = await fetchCheeseApi<unknown>({
    timestamp,
    url: `https://stock.cheesefortune.com/api/v3/details/pepb?code=${code}&type=${type}&years=5Y&t=${obfuscateTimestamp(timestamp)}`,
    Referer: `https://stock.cheesefortune.com/security/index/${code}`,
  });
  if (response.kind !== "data") return response;

  const metric = parsePepbMetric(type, response.data);
  if (!metric) {
    return errorResult("schema", `pepb ${type} 返回结构不正确`, false);
  }
  if (metric.points.length === 0) {
    return emptyResult(`pepb ${type} 没有数据`, response.raw);
  }

  return dataResult(metric, response.raw);
}
