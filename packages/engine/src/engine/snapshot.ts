import { createHash } from "node:crypto";

import type { MarketData } from "../data/marketData";

export interface SnapshotRow {
  code: string;
  date: number;
  preAdjustPrice: number;
  preAdjustFactor: number;
}

/** 固化前复权快照：区间内每只标的每一天的前复权价与因子。 */
export function buildAdjustSnapshot(market: MarketData): SnapshotRow[] {
  const rows: SnapshotRow[] = [];
  for (const code of [...market.series.keys()].sort()) {
    const series = market.series.get(code);
    if (!series) continue;
    for (let i = 0; i < series.dates.length; i++) {
      rows.push({
        code,
        date: series.dates[i],
        preAdjustPrice: series.preClose[i],
        preAdjustFactor: series.preFactor[i],
      });
    }
  }
  return rows;
}

/** 前复权快照哈希，用于复现校验。 */
export function hashSnapshot(rows: SnapshotRow[]): string {
  const hash = createHash("sha256");
  for (const row of rows) {
    hash.update(`${row.code},${row.date},${row.preAdjustPrice},${row.preAdjustFactor}\n`);
  }
  return hash.digest("hex");
}
