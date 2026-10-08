import { prisma } from "@quant-backtest/db";

import type { LinkEtfRecord } from "./fetch";

/** 关联关系是快照：按 target 整体替换。 */
export async function persistLinkEtfs(
  target: string,
  records: LinkEtfRecord[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.linkEtf.deleteMany({ where: { target } });
    await tx.linkEtf.createMany({
      data: records.map((record) => ({
        target,
        source: record.code,
        similar: record.similar,
      })),
    });
  });
}
