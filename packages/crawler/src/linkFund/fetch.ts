import { fetchCheeseApi } from "../utils/fetchCheeseApi";
import {
  dataResult,
  emptyResult,
  errorResult,
  isRecord,
  type FetchResult,
} from "../utils/fetchResult";
import { obfuscateTimestamp } from "../utils/obfuscateTimestamp";

export interface LinkEtfRecord {
  code: string;
  similar: number | null;
}

function isLinkEtf(value: unknown): value is {
  code: string;
  similar: number | null;
} {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    (value.similar === null || typeof value.similar === "number")
  );
}

export async function fetchLinkFund(
  code = "513050.SH",
): Promise<FetchResult<LinkEtfRecord[]>> {
  const timestamp = Date.now();
  const response = await fetchCheeseApi<unknown>({
    timestamp,
    url: `https://stock.cheesefortune.com/api/v4/etf/linkFund/${code.replace(".", "")}?t=${obfuscateTimestamp(timestamp)}`,
    Referer: `https://stock.cheesefortune.com/security/etf/${code}`,
  });
  if (response.kind !== "data") return response;

  if (!isRecord(response.data) || !Array.isArray(response.data.etfs)) {
    return errorResult("schema", "关联 ETF 接口响应结构不正确", false);
  }
  if (response.data.etfs.length === 0) {
    return emptyResult("关联 ETF 为空", response.raw);
  }
  if (!response.data.etfs.every(isLinkEtf)) {
    return errorResult("schema", "关联 ETF 包含无法识别的记录", false);
  }

  return dataResult(
    response.data.etfs.map((item) => ({
      code: item.code,
      similar: item.similar,
    })),
    response.raw,
  );
}
