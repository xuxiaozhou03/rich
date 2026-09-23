import { fetchCheeseApi } from "../utils/fetchCheeseApi";
import { obfuscateTimestamp } from "../utils/obfuscateTimestamp";

export const fetchHoldAllFund = async (code = "513050.SH") => {
  const timestamp = Date.now(); // 13 位毫秒时间戳

  const res = await fetchCheeseApi({
    timestamp,
    url: `https://stock.cheesefortune.com/api/v4/etf/holdAll/${code.replace(".", "")}?t=${obfuscateTimestamp(timestamp)}`,
    Referer: `https://stock.cheesefortune.com/security/etf/${code}`,
  });

  const { list } = res as {
    list: Array<{ code: string; name: string; holdScale: number }>;
  };
  const data = list.map((item) => ({
    code: item.code,
    name: item.name,
    holdeScale: item.holdScale,
  }));

  return data;
};

fetchHoldAllFund();
