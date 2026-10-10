import { prisma } from "@quant-backtest/db";

import type { PepbMetric } from "./types";

/** SQLite createMany 单批行数上限，避免超出绑定参数上限。 */
const CREATE_MANY_CHUNK = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

/** pepb 每个 metric 全量返回，因此按 indexCode + metric 整体替换。 */
export async function persistPepbMetric(
  indexCode: string,
  metric: PepbMetric,
): Promise<void> {
  const records = metric.points.map((point) => ({
    indexCode,
    metric: metric.type,
    date: point.date,
    value: point.value,
    percentile: point.percentile,
  }));

  const hasRange =
    metric.min !== null || metric.max !== null || metric.mid !== null;

  await prisma.$transaction(async (tx) => {
    await tx.etfValuation.deleteMany({
      where: { indexCode, metric: metric.type },
    });
    if (records.length > 0) {
      for (const batch of chunk(records, CREATE_MANY_CHUNK)) {
        await tx.etfValuation.createMany({ data: batch });
      }
    }
    await tx.etfValuationMetric.deleteMany({
      where: { indexCode, metric: metric.type },
    });
    if (hasRange) {
      await tx.etfValuationMetric.create({
        data: {
          indexCode,
          metric: metric.type,
          min: metric.min,
          max: metric.max,
          mid: metric.mid,
        },
      });
    }
  });
}
