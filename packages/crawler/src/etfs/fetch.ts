import {
  dataResult,
  emptyResult,
  errorResult,
  isRecord,
  type FetchResult,
} from "../utils/fetchResult";
import { fetchJson } from "../utils/fetchJson";

const trackingIndexBlackList = ["短融", "城投", "债", "信用"];

interface OriginalEtf {
  securityName: string;
  securityCode: string;
  scale: number | null;
  trackingIndex: string | null;
  trackIndex: string | null;
}

export interface EtfRecord {
  code: string;
  name: string;
  scale: number;
  trackingIndex: string;
  trackIndex: string | null;
}

function isOriginalEtf(value: unknown): value is OriginalEtf {
  if (!isRecord(value)) return false;
  return (
    typeof value.securityName === "string" &&
    typeof value.securityCode === "string" &&
    (value.scale === null || typeof value.scale === "number") &&
    (value.trackingIndex === null ||
      typeof value.trackingIndex === "string") &&
    (value.trackIndex === null || typeof value.trackIndex === "string")
  );
}

export async function fetchEtfs(): Promise<FetchResult<EtfRecord[]>> {
  const response = await fetchJson(
    "https://hongsehuojian.com/fundex-quote/allPage/findListByEtf?classA=&classB=&orderBy=l.scale&order=desc&searchValue=&isSelected=&pageNo=1&pageSize=2000&position=",
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        "cache-control": "no-cache",
        pragma: "no-cache",
        pro: "RedRocket-PC",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
      },
      method: "GET",
    },
    45_000,
  );
  if (response.kind !== "data") return response;

  const body = response.data.body;
  if (
    !isRecord(body) ||
    !isRecord(body.data) ||
    !Array.isArray(body.data.data)
  ) {
    return errorResult("schema", "ETF 列表接口响应结构不正确", false);
  }

  const originalList = body.data.data;
  if (originalList.length === 0) {
    return emptyResult("ETF 列表为空", body);
  }
  if (!originalList.every(isOriginalEtf)) {
    return errorResult("schema", "ETF 列表包含无法识别的记录", false);
  }

  const data = originalList
    .filter((etf) => etf.trackingIndex)
    .filter(
      (etf): etf is OriginalEtf & { scale: number } =>
        typeof etf.scale === "number",
    )
    .filter((etf) => etf.scale >= 300_000_000)
    .filter(
      (etf) =>
        !trackingIndexBlackList.some((item) =>
          etf.trackingIndex?.includes(item),
        ),
    )
    .map(
      (etf): EtfRecord => ({
        code: etf.securityCode,
        name: etf.securityName,
        scale: etf.scale,
        trackingIndex: etf.trackingIndex!,
        trackIndex: etf.trackIndex,
      }),
    );

  const grouped = data.reduce<Record<string, EtfRecord>>((acc, etf) => {
    const current = acc[etf.trackingIndex];
    if (!current || current.scale < etf.scale) acc[etf.trackingIndex] = etf;
    return acc;
  }, {});

  return dataResult(Object.values(grouped), body);
}
