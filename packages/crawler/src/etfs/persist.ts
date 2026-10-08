import { prisma } from "@quant-backtest/db";

import type { EtfRecord } from "./fetchEtfs";

/** ETF 列表是快照：按接口结果整表对齐，接口里没有的标的会被删掉。 */
export async function persistEtfs(records: EtfRecord[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const record of records) {
      await tx.etf.upsert({
        where: { code: record.code },
        create: record,
        update: {
          name: record.name,
          scale: record.scale,
          trackingIndex: record.trackingIndex,
          trackIndex: record.trackIndex,
        },
      });
    }

    await tx.etf.deleteMany({
      where: { code: { notIn: records.map((record) => record.code) } },
    });
  });
}
