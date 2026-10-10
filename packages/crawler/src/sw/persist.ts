import { prisma } from "@quant-backtest/db";

import type { SwMapData } from "./types";

/** SQLite createMany 单批行数上限，避免超出绑定参数上限。 */
const CREATE_MANY_CHUNK = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

/** swMap 每次返回全量行业权重，因此按 indexCode 整体替换。 */
export async function persistSwMap(data: SwMapData): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.indexSwIndustry.deleteMany({
      where: { indexCode: data.indexCode },
    });
    for (const batch of chunk(data.industries, CREATE_MANY_CHUNK)) {
      await tx.indexSwIndustry.createMany({ data: batch });
    }
  });
}
