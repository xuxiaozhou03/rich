import { isRecord } from "../utils/fetchResult";
import type { SwIndustry, SwLevel } from "./types";

const LEVELS: Array<[keyof Pick<Record<string, unknown>, "sw1" | "sw2" | "sw3">, SwLevel]> = [
  ["sw1", 1],
  ["sw2", 2],
  ["sw3", 3],
];

function parseIndustry(
  value: unknown,
  level: SwLevel,
): SwIndustry | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.code !== "string" ||
    typeof value.name !== "string" ||
    typeof value.capitalOrIndex !== "string" ||
    typeof value.weight !== "number" ||
    !Number.isFinite(value.weight)
  ) {
    return null;
  }

  return {
    level,
    industryCode: value.code,
    name: value.name,
    weight: value.weight,
    capitalOrIndex: value.capitalOrIndex,
  };
}

export function parseSwMap(value: unknown): SwIndustry[] | null {
  if (!isRecord(value)) return null;
  if (LEVELS.some(([key]) => !Array.isArray(value[key]))) return null;

  const industries: SwIndustry[] = [];
  for (const [key, level] of LEVELS) {
    for (const row of value[key] as unknown[]) {
      const industry = parseIndustry(row, level);
      if (industry) industries.push(industry);
    }
  }
  return industries;
}
