import { Prisma, prisma } from "@rich/db";
import { RunTaskOptions } from "../utils/runTask";
import { fetchEtfs } from "./fetch";

export const etfsTask: RunTaskOptions<Prisma.EtfCreateInput[]> = {
  name: "etfs",
  execute: fetchEtfs,
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
