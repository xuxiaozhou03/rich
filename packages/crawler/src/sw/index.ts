import { Sw, prisma } from "@rich/db";
import { fetchCheeseApi, generateV4Timestamp } from "../utils/fetchCheeseApi";
import { RunTaskOptions } from "../utils/runTask";

export const getSwTask = (indexCode: string): RunTaskOptions<Sw[]> => {
  return {
    name: `sw:${indexCode}`,
    execute: async () => {
      const timestamp = Date.now();
      const t = generateV4Timestamp(String(timestamp));

      const encodedCode = encodeURIComponent(indexCode.replace(".", ""));
      const result = await fetchCheeseApi<{
        sw1: Array<{
          code: string;
          name: string;
          weight: number;
        }>;
        sw2: Array<{
          code: string;
          name: string;
          weight: number;
        }>;
        sw3: Array<{
          code: string;
          name: string;
          weight: number;
        }>;
      }>({
        url: `https://stock.cheesefortune.com/api/v4/index/swMap/all/${encodedCode}?t=${t}`,
        Referer: `https://stock.cheesefortune.com/security/index/${indexCode}?blank=true`,
        timestamp,
      });
      return [
        ...result.sw1.map((sw) => ({
          indexCode,
          level: 1,
          industryCode: sw.code,
          industryName: sw.name,
          weight: sw.weight,
        })),
        ...result.sw2.map((sw) => ({
          indexCode,
          level: 2,
          industryCode: sw.code,
          industryName: sw.name,
          weight: sw.weight,
        })),
        ...result.sw3.map((sw) => ({
          indexCode,
          level: 3,
          industryCode: sw.code,
          industryName: sw.name,
          weight: sw.weight,
        })),
      ];
    },
    persist: async (data) => {
      await prisma.$transaction(async (tx) => {
        await tx.sw.deleteMany({ where: { indexCode } });
        await tx.sw.createMany({ data });
      });
    },
  };
};
