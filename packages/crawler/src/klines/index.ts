import { Kline, prisma } from "@rich/db";
import { RunTaskOptions } from "../utils/runTask";
import { fetchKline } from "./fetch";

export const getKlineTask = (code: string): RunTaskOptions<Kline[]> => {
  return {
    name: `kline:${code}`,
    execute: () => fetchKline(code),
    persist: async (data) => {
      await prisma.$transaction(async (tx) => {
        await tx.kline.deleteMany({ where: { code } });
        await tx.kline.createMany({
          data,
        });
      });
    },
  };
};
