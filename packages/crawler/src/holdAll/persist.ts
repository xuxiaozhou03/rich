import { prisma } from "@quant-backtest/db";

import type { EtfHoldingRecord } from "./fetch";

/** 持仓是快照：按 etfCode 整体替换。 */
export async function persistHoldings(
  etfCode: string,
  records: EtfHoldingRecord[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.etfHolding.deleteMany({ where: { etfCode } });
    await tx.etfHolding.createMany({
      data: records.map((record) => ({
        etfCode,
        securityCode: record.securityCode,
        name: record.name,
        holdScale: record.holdScale,
      })),
    });
  });
}
