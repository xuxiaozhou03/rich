import { prisma, TaskOptions } from "@/shared";
import { fetchKline } from "./fetch";
import { Kline } from "@prisma/client";

export const getKlineTask = (code: string): TaskOptions<Kline[]> => {
  return {
    name: `kline:${code}`,
    execute: () => fetchKline(code),
    validate(data) {
      return true;
    },
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
