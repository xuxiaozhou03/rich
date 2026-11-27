import { prisma, TaskOptions } from "@/shared";
import { fetchEtfs } from "./fetch";
import { Etf } from "@prisma/client";

export const etfsTask: TaskOptions<Etf[]> = {
  name: "etfs",
  execute: fetchEtfs,
  validate(data) {
    return true;
  },
  persist: async (data) => {
    await prisma.$transaction(async (tx) => {
      for (const record of data) {
        await tx.etf.upsert({
          where: { code: record.code },
          create: record,
          update: record,
        });
      }

      // 还需要清除其他
      await tx.etf.deleteMany({
        where: { code: { notIn: data.map((record) => record.code) } },
      });
    });
  },
};
