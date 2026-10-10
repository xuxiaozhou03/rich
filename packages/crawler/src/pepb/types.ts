/**
 * pepb 接口的四种 type：
 * indexGZPer=综合估值分位，pe=市盈率，pb=市净率，psTtm=市销率。
 */
export const PEPB_TYPES = ["pe", "pb", "psTtm", "indexGZPer"] as const;

export type PepbType = (typeof PEPB_TYPES)[number];

export interface PepbPoint {
  date: number;
  value: number;
  /** 历史估值分位，综合估值 indexGZPer 没有该字段。 */
  percentile: number | null;
}

export interface PepbMetric {
  type: PepbType;
  min: number | null;
  max: number | null;
  mid: number | null;
  points: PepbPoint[];
}
