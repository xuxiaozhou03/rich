import { fetchCheeseApi } from "../utils/fetchCheeseApi";
import {
  dataResult,
  emptyResult,
  errorResult,
  type FetchResult,
} from "../utils/fetchResult";
import { obfuscateTimestamp } from "../utils/obfuscateTimestamp";
import { parseSwMap } from "./parsers";
import type { SwMapData } from "./types";

/** 抓取一个跟踪指数的申万一级/二级/三级行业权重。 */
export async function fetchSwMap(
  indexCode = "399019.SZ",
): Promise<FetchResult<SwMapData>> {
  const timestamp = Date.now();
  const pathCode = indexCode.replace(".", "");
  const response = await fetchCheeseApi<unknown>({
    timestamp,
    url: `https://stock.cheesefortune.com/api/v4/index/swMap/all/${pathCode}?t=${obfuscateTimestamp(timestamp)}`,
    Referer: `https://stock.cheesefortune.com/security/index/${indexCode}`,
  });
  if (response.kind !== "data") return response;

  const industries = parseSwMap(response.data);
  if (!industries) {
    return errorResult("schema", "swMap 返回结构不正确", false);
  }
  if (industries.length === 0) {
    return emptyResult("swMap 没有行业权重数据", response.raw);
  }

  return dataResult(
    {
      indexCode,
      industries: industries.map((industry) => ({
        indexCode,
        ...industry,
      })),
    },
    response.raw,
  );
}
