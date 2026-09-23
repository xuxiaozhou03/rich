import { fetchCheeseApi } from "../utils/fetchCheeseApi";
import { obfuscateTimestamp } from "../utils/obfuscateTimestamp";

export const fetchLinkFund = async (code = "513050.SH") => {
  const timestamp = Date.now(); // 13 位毫秒时间戳

  const res = await fetchCheeseApi({
    timestamp,
    url: `https://stock.cheesefortune.com/api/v4/etf/linkFund/${code.replace(".", "")}?t=${obfuscateTimestamp(timestamp)}`,
    Referer: `https://stock.cheesefortune.com/security/etf/${code}`,
  });
  if (!res) {
    return [];
  }
  const { etfs } = res as { etfs: Array<{ similar: number; code: string }> };
  const formatedEtfs = etfs.map((etf) => ({
    code: etf.code,
    similar: etf.similar,
  }));
  return formatedEtfs;
};
