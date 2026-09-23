import { fetchCheeseApi } from "../utils/fetchCheeseApi";
import {
  dataResult,
  emptyResult,
  errorResult,
  isRecord,
  type FetchResult,
} from "../utils/fetchResult";
import { obfuscateTimestamp } from "../utils/obfuscateTimestamp";

export interface EtfHoldingRecord {
  securityCode: string;
  name: string;
  holdScale: number;
}

function isHolding(value: unknown): value is {
  code: string;
  name: string;
  holdScale: number;
} {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.name === "string" &&
    typeof value.holdScale === "number"
  );
}

export async function fetchHoldAllFund(
  code = "513050.SH",
): Promise<FetchResult<EtfHoldingRecord[]>> {
  const timestamp = Date.now();
  const response = await fetchCheeseApi<unknown>({
    timestamp,
    url: `https://stock.cheesefortune.com/api/v4/etf/holdAll/${code.replace(".", "")}?t=${obfuscateTimestamp(timestamp)}`,
    Referer: `https://stock.cheesefortune.com/security/etf/${code}`,
  });
  if (response.kind !== "data") return response;

  if (!isRecord(response.data) || !Array.isArray(response.data.list)) {
    return errorResult("schema", "持仓接口响应结构不正确", false);
  }
  if (response.data.list.length === 0) {
    return emptyResult("持仓列表为空", response.raw);
  }
  if (!response.data.list.every(isHolding)) {
    return errorResult("schema", "持仓列表包含无法识别的记录", false);
  }

  return dataResult(
    response.data.list.map((item) => ({
      securityCode: item.code,
      name: item.name,
      holdScale: item.holdScale,
    })),
    response.raw,
  );
}
