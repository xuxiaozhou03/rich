import type { UniverseSpec } from "@quant-backtest/shared";

export interface EtfMeta {
  code: string;
  trackingIndex: string;
  scale: number | null;
}

/** 按标的池定义解析出 code 列表。 */
export function resolveUniverse(spec: UniverseSpec, etfs: EtfMeta[]): string[] {
  switch (spec.mode) {
    case "all":
      return etfs.map((e) => e.code);
    case "index":
      return etfs.filter((e) => e.trackingIndex === spec.index).map((e) => e.code);
    case "scale":
      return etfs.filter((e) => (e.scale ?? 0) >= spec.minScale).map((e) => e.code);
    case "fixed":
      return [...spec.codes];
  }
}
