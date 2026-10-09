import { meanReversionStrategy } from "./meanReversion";
import { momentumStrategy } from "./momentum";

import type { StrategyMeta } from "@quant-backtest/shared";

export * from "./momentum";
export * from "./meanReversion";

/** 策略注册表：id -> 策略。 */
export const strategies: Record<string, StrategyMeta> = {
  [momentumStrategy.id]: momentumStrategy,
  [meanReversionStrategy.id]: meanReversionStrategy,
};

export function getStrategy(id: string): StrategyMeta {
  const strategy = strategies[id];
  if (!strategy) throw new Error(`未知策略：${id}`);
  return strategy;
}
