import {
  fetchCheeseApi,
  generateV4Timestamp,
  prisma,
  TaskOptions,
} from "@/shared";
import { Holding } from "@prisma/client";

export const getHoldAllTask = (code: string): TaskOptions<Holding[]> => {
  return {
    name: `hold_all:${code}`,
    validate(data) {
      return true;
    },
    execute: async () => {
      const timestamp = Date.now();
      const t = generateV4Timestamp(String(timestamp));

      const encodedCode = encodeURIComponent(code.replace(".", ""));
      const result = await fetchCheeseApi<{
        list: Array<{
          code: string;
          name: string;
          holdScale: number;
        }>;
      }>({
        url: `https://stock.cheesefortune.com/api/v4/etf/holdAll/${code.replace(".", "")}?t=${t}`,
        Referer: `https://stock.cheesefortune.com/security/etf/${encodedCode}?blank=true`,
        timestamp,
      });

      if (result.list.length === 0) {
        throw new Error("数据为空");
      }
      return result.list.map((item) => ({
        code,
        stockCode: item.code,
        holdScale: item.holdScale,
        stockName: item.name,
      }));
    },
    persist: async (records) => {
      await prisma.$transaction(async (tx) => {
        await tx.holding.deleteMany({ where: { code } });
        await tx.holding.createMany({
          data: records,
        });
      });
    },
  };
};
