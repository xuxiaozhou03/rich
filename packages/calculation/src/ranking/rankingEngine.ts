/**
 * ETF Ranking Engine
 *
 * ETF 横截面排名引擎
 *
 * 功能：
 * 1. Performance：收益排名
 * 2. Risk：风险排名
 * 3. RiskAdjusted：风险调整后收益排名
 * 4. Valuation：估值排名
 * 5. RPS：全部输入 ETF 的相对价格强度
 * 6. 与上一交易日排名快照比较
 *
 * 设计约定：
 * - 输入必须是同一交易日的 EtfDailyFeatures
 * - 上一交易日排名由调用方传入
 * - RPS 比较范围为全部输入 ETF
 * - 不计算综合总排名
 * - 不重新定义 EtfDailyFeatures 及其子类型
 * - 并列排名采用平均排名
 * - null / NaN / Infinity 不参与排名
 * - 只有一个有效样本时，rank 为 1，percentile 为 null
 */

import type {
  EtfDailyFeatures,
  PerformancePeriod,
} from "../features/etfDailyFeatures";

// ============================================================
// 1. 基础类型
// ============================================================

export type RankingPeriod = PerformancePeriod;

export type PerformanceMetric = "return" | "annualizedReturn" | "winRate";

export type RiskMetric =
  | "volatility"
  | "downsideVolatility"
  | "maxDrawdown"
  | "currentDrawdown"
  | "var95"
  | "cvar95"
  | "maxDrawdownDuration"
  | "currentDrawdownDuration";

export type RiskAdjustedMetric = "sharpeRatio" | "sortinoRatio" | "calmarRatio";

export type ValuationMetricKey = "pe" | "pb" | "ps";

export type RpsPeriod = "1m" | "3m" | "6m" | "1y";

export type NullableNumber = number | null;

// ============================================================
// 2. 排名配置
// ============================================================

export interface RankingMetricConfig {
  /** true：数值越大排名越靠前 */
  higherIsBetter: boolean;

  /** 是否启用该指标排名 */
  enabled: boolean;
}

export type RankingMetricKey =
  | `performance.${RankingPeriod}.${PerformanceMetric}`
  | `risk.${RankingPeriod}.${RiskMetric}`
  | `riskAdjusted.${RankingPeriod}.${RiskAdjustedMetric}`
  | `valuation.${ValuationMetricKey}`;

export type RankingMetricConfigMap = Partial<
  Record<RankingMetricKey, Partial<RankingMetricConfig>>
>;

export interface RankingOptions {
  /** 指标级别的排名配置 */
  metrics?: RankingMetricConfigMap;

  /** 是否计算收益排名，默认 true */
  includePerformance?: boolean;

  /** 是否计算风险排名，默认 true */
  includeRisk?: boolean;

  /** 是否计算风险调整后收益排名，默认 true */
  includeRiskAdjusted?: boolean;

  /** 是否计算估值排名，默认 true */
  includeValuation?: boolean;

  /** RPS 计算周期，默认 1m / 3m / 6m / 1y */
  rpsPeriods?: RpsPeriod[];
}

// ============================================================
// 3. 输出类型
// ============================================================

export interface RankingItem {
  /** 原始指标值 */
  value: NullableNumber;

  /** 当日排名，1 为最好 */
  rank: number | null;

  /** 上一交易日排名 */
  previousRank: number | null;

  /**
   * 排名变化 = previousRank - rank
   *
   * 正数：名次上升
   * 负数：名次下降
   * 0：名次不变
   */
  rankChange: number | null;

  /** 当日横截面百分位，最好 100，最差 0 */
  percentile: number | null;
}

export type PerformanceRanking = Record<
  RankingPeriod,
  Record<PerformanceMetric, RankingItem>
>;

export type RiskRanking = Record<
  RankingPeriod,
  Record<RiskMetric, RankingItem>
>;

export type RiskAdjustedRanking = Record<
  RankingPeriod,
  Record<RiskAdjustedMetric, RankingItem>
>;

export type ValuationRanking = Record<ValuationMetricKey, RankingItem>;

export interface RpsItem {
  /** RPS 百分位，范围 0～100 */
  value: number | null;

  /** 对应周期收益率 */
  return: number | null;

  /** 当日收益率排名 */
  rank: number | null;

  /** 上一交易日收益率排名 */
  previousRank: number | null;

  /** 排名变化 */
  rankChange: number | null;

  /** 上一交易日 RPS */
  previousValue: number | null;

  /** RPS 变化值 */
  change: number | null;
}

export type RpsRanking = Record<RpsPeriod, RpsItem>;

export interface EtfRankingResult {
  code: string;
  date: number;

  performance: PerformanceRanking;

  risk: RiskRanking;

  riskAdjusted: RiskAdjustedRanking;

  valuation: ValuationRanking;

  /** 全部输入 ETF 横向比较的 RPS */
  rps: RpsRanking;
}

/** 排行榜中的单个 ETF */
export interface RankingOverviewItem {
  code: string;
  value: number | null;
  rank: number | null;
  previousRank: number | null;
  rankChange: number | null;
  percentile: number | null;
}

/**
 * 排行榜总览。
 *
 * key 示例：
 * performance.1m.return
 * performance.3m.annualizedReturn
 * risk.1m.maxDrawdown
 * riskAdjusted.1m.sharpeRatio
 * valuation.pe
 * rps.1m
 *
 * 每个 key 对应一份按排名排序的 ETF 列表。
 */
export type RankingOverview = Record<string, RankingOverviewItem[]>;

export interface RankingSummary {
  date: number;
  previousDate: number | null;
  totalEtfs: number;

  /** 至少有一个普通指标有效排名的 ETF 数量 */
  rankedEtfs: number;

  /** RPS 比较范围 */
  rpsUniverse: "allEtfs";
}

export interface RankingEngineResult {
  summary: RankingSummary;

  /** 每只 ETF 的完整排名结果 */
  items: EtfRankingResult[];

  /** 各指标独立排行榜 */
  rankings: RankingOverview;
}

// ============================================================
// 4. 常量
// ============================================================

const PERFORMANCE_METRICS = [
  "return",
  "annualizedReturn",
  "winRate",
] as const satisfies readonly PerformanceMetric[];

const RISK_METRICS = [
  "volatility",
  "downsideVolatility",
  "maxDrawdown",
  "currentDrawdown",
  "var95",
  "cvar95",
  "maxDrawdownDuration",
  "currentDrawdownDuration",
] as const satisfies readonly RiskMetric[];

const RISK_ADJUSTED_METRICS = [
  "sharpeRatio",
  "sortinoRatio",
  "calmarRatio",
] as const satisfies readonly RiskAdjustedMetric[];

const VALUATION_METRICS = [
  "pe",
  "pb",
  "ps",
] as const satisfies readonly ValuationMetricKey[];

const DEFAULT_RPS_PERIODS: readonly RpsPeriod[] = ["1m", "3m", "6m", "1y"];

const DEFAULT_METRIC_CONFIG: RankingMetricConfig = {
  enabled: true,
  higherIsBetter: true,
};

// ============================================================
// 5. 通用工具
// ============================================================

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeNumber(value: unknown): number | null {
  return isFiniteNumber(value) ? value : null;
}

function getMetricConfig(
  key: RankingMetricKey,
  options: RankingOptions,
  defaultHigherIsBetter: boolean,
): RankingMetricConfig {
  const override = options.metrics?.[key];

  return {
    enabled: override?.enabled ?? DEFAULT_METRIC_CONFIG.enabled,

    higherIsBetter: override?.higherIsBetter ?? defaultHigherIsBetter,
  };
}

function emptyRankingItem(value: number | null = null): RankingItem {
  return {
    value,
    rank: null,
    previousRank: null,
    rankChange: null,
    percentile: null,
  };
}

function emptyRpsItem(): RpsItem {
  return {
    value: null,
    return: null,
    rank: null,
    previousRank: null,
    rankChange: null,
    previousValue: null,
    change: null,
  };
}

// ============================================================
// 6. 输入校验
// ============================================================

function assertValidInputs(
  etfs: EtfDailyFeatures[],
  previousRanking?: EtfRankingResult[],
): number {
  if (!Array.isArray(etfs) || etfs.length === 0) {
    throw new Error("rankEtfs: etfs 不能为空");
  }

  const date = etfs[0].date;

  if (!isFiniteNumber(date)) {
    throw new Error("rankEtfs: ETF date 必须是有效数字");
  }

  const codes = new Set<string>();

  for (const etf of etfs) {
    if (!etf.code) {
      throw new Error("rankEtfs: ETF code 不能为空");
    }

    if (etf.date !== date) {
      throw new Error(
        `rankEtfs: 输入 ETF 必须是同一交易日，${etf.code} 的日期为 ${etf.date}，期望 ${date}`,
      );
    }

    if (codes.has(etf.code)) {
      throw new Error(`rankEtfs: 存在重复 ETF code：${etf.code}`);
    }

    codes.add(etf.code);
  }

  if (previousRanking?.length) {
    const previousDate = previousRanking[0].date;

    if (previousDate >= date) {
      throw new Error(
        `rankEtfs: 上一交易日排名日期必须早于当前日期，当前=${date}，上一日期=${previousDate}`,
      );
    }

    const previousCodes = new Set<string>();

    for (const item of previousRanking) {
      if (item.date !== previousDate) {
        throw new Error("rankEtfs: previousRanking 必须来自同一个交易日");
      }

      if (previousCodes.has(item.code)) {
        throw new Error(`rankEtfs: previousRanking 存在重复 ETF：${item.code}`);
      }

      previousCodes.add(item.code);
    }
  }

  return date;
}

// ============================================================
// 7. 横截面排名算法
// ============================================================

interface RankInput {
  code: string;
  value: number | null;
}

interface RankOutput {
  code: string;
  value: number | null;
  rank: number | null;
  percentile: number | null;
}

/**
 * 横截面排名。
 *
 * higherIsBetter：
 * - true：从大到小
 * - false：从小到大
 *
 * 并列排名采用平均排名。
 *
 * 百分位：
 * - 最好为 100
 * - 最差为 0
 * - 只有一个有效样本时为 null
 */
function calculateCrossSectionRank(
  inputs: RankInput[],
  higherIsBetter: boolean,
): RankOutput[] {
  const valid = inputs
    .filter((item) => isFiniteNumber(item.value))
    .slice()
    .sort((a, b) => {
      const difference = a.value! - b.value!;

      return higherIsBetter ? -difference : difference;
    });

  const rankMap = new Map<
    string,
    {
      rank: number;
      percentile: number | null;
    }
  >();

  let index = 0;

  while (index < valid.length) {
    let end = index + 1;

    while (end < valid.length && valid[end].value === valid[index].value) {
      end++;
    }

    // 当前并列区间的平均排名
    const averageRank = (index + 1 + end) / 2;

    const percentile =
      valid.length <= 1
        ? null
        : ((valid.length - averageRank) / (valid.length - 1)) * 100;

    for (let i = index; i < end; i++) {
      rankMap.set(valid[i].code, {
        rank: averageRank,
        percentile,
      });
    }

    index = end;
  }

  return inputs.map((item) => {
    const result = rankMap.get(item.code);

    return {
      code: item.code,
      value: item.value,
      rank: result?.rank ?? null,
      percentile: result?.percentile ?? null,
    };
  });
}

// ============================================================
// 8. 上一交易日排名索引
// ============================================================

function indexPreviousRanking(
  previousRanking?: EtfRankingResult[],
): Map<string, EtfRankingResult> {
  return new Map((previousRanking ?? []).map((item) => [item.code, item]));
}

function createRankingItem(
  current: RankOutput,
  previousRank: number | null,
): RankingItem {
  return {
    value: current.value,
    rank: current.rank,
    previousRank,

    rankChange:
      current.rank !== null && previousRank !== null
        ? previousRank - current.rank
        : null,

    percentile: current.percentile,
  };
}

function getPreviousRank(
  previous: EtfRankingResult | undefined,
  category: "performance" | "risk" | "riskAdjusted",
  period: RankingPeriod,
  metric: string,
): number | null {
  if (!previous) return null;

  const categoryData = previous[category] as unknown as Record<
    string,
    Record<string, RankingItem>
  >;

  return categoryData?.[period]?.[metric]?.rank ?? null;
}

// ============================================================
// 9. 指标排名计算
// ============================================================

type RankingMap = Map<string, Map<RankingMetricKey, RankingItem>>;

function saveRanking(
  map: RankingMap,
  key: RankingMetricKey,
  items: RankingItem[],
  etfs: EtfDailyFeatures[],
): void {
  items.forEach((item, index) => {
    const code = etfs[index].code;

    map.get(code)!.set(key, item);
  });
}

function calculateMetricRanking(
  etfs: EtfDailyFeatures[],
  previousByCode: Map<string, EtfRankingResult>,
  key: RankingMetricKey,
  getValue: (etf: EtfDailyFeatures) => number | null,
  higherIsBetter: boolean,
  getPreviousRankValue: (
    previous: EtfRankingResult | undefined,
  ) => number | null,
): RankingItem[] {
  const ranked = calculateCrossSectionRank(
    etfs.map((etf) => ({
      code: etf.code,
      value: getValue(etf),
    })),
    higherIsBetter,
  );

  return ranked.map((item) => {
    const previous = previousByCode.get(item.code);

    return createRankingItem(item, getPreviousRankValue(previous));
  });
}

function calculateAllMetricRankings(
  etfs: EtfDailyFeatures[],
  previousByCode: Map<string, EtfRankingResult>,
  options: RankingOptions,
): RankingMap {
  const result: RankingMap = new Map();

  for (const etf of etfs) {
    result.set(etf.code, new Map());
  }

  const periods = Object.keys(etfs[0].periods) as RankingPeriod[];

  // ----------------------------------------------------------
  // Performance
  // ----------------------------------------------------------

  if (options.includePerformance !== false) {
    for (const period of periods) {
      for (const metric of PERFORMANCE_METRICS) {
        const key = `performance.${period}.${metric}` as RankingMetricKey;

        const config = getMetricConfig(key, options, true);

        if (!config.enabled) continue;

        const ranked = calculateMetricRanking(
          etfs,
          previousByCode,
          key,
          (etf) => normalizeNumber(etf.periods[period]?.performance?.[metric]),
          config.higherIsBetter,
          (previous) =>
            getPreviousRank(previous, "performance", period, metric),
        );

        saveRanking(result, key, ranked, etfs);
      }
    }
  }

  // ----------------------------------------------------------
  // Risk
  // ----------------------------------------------------------

  if (options.includeRisk !== false) {
    for (const period of periods) {
      for (const metric of RISK_METRICS) {
        const key = `risk.${period}.${metric}` as RankingMetricKey;

        // 回撤为负数时，越接近 0 越好。
        // 波动率、VaR、CVaR、回撤持续时间越小越好。
        const defaultHigherIsBetter =
          metric === "maxDrawdown" || metric === "currentDrawdown";

        const config = getMetricConfig(key, options, defaultHigherIsBetter);

        if (!config.enabled) continue;

        const ranked = calculateMetricRanking(
          etfs,
          previousByCode,
          key,
          (etf) => normalizeNumber(etf.periods[period]?.risk?.[metric]),
          config.higherIsBetter,
          (previous) => getPreviousRank(previous, "risk", period, metric),
        );

        saveRanking(result, key, ranked, etfs);
      }
    }
  }

  // ----------------------------------------------------------
  // Risk Adjusted
  // ----------------------------------------------------------

  if (options.includeRiskAdjusted !== false) {
    for (const period of periods) {
      for (const metric of RISK_ADJUSTED_METRICS) {
        const key = `riskAdjusted.${period}.${metric}` as RankingMetricKey;

        const config = getMetricConfig(key, options, true);

        if (!config.enabled) continue;

        const ranked = calculateMetricRanking(
          etfs,
          previousByCode,
          key,
          (etf) => normalizeNumber(etf.periods[period]?.risk?.[metric]),
          config.higherIsBetter,
          (previous) =>
            getPreviousRank(previous, "riskAdjusted", period, metric),
        );

        saveRanking(result, key, ranked, etfs);
      }
    }
  }

  // ----------------------------------------------------------
  // Valuation
  // ----------------------------------------------------------

  if (options.includeValuation !== false) {
    for (const metric of VALUATION_METRICS) {
      const key = `valuation.${metric}` as RankingMetricKey;

      // 历史估值百分位越低，当前估值越便宜。
      const config = getMetricConfig(key, options, false);

      if (!config.enabled) continue;

      const ranked = calculateMetricRanking(
        etfs,
        previousByCode,
        key,
        (etf) => normalizeNumber(etf.valuation?.[metric]?.percentile),
        config.higherIsBetter,
        (previous) => previous?.valuation?.[metric]?.rank ?? null,
      );

      saveRanking(result, key, ranked, etfs);
    }
  }

  return result;
}

// ============================================================
// 10. RPS 计算
// ============================================================

/**
 * RPS = 当前 ETF 在全部输入 ETF 中的收益率百分位。
 *
 * 比较范围：全部输入 ETF。
 *
 * 注意：
 * 这里的 1m / 3m / 6m / 1y 是特征周期，
 * 不是严格的 20 / 60 / 120 / 250 个交易日。
 */
function calculateRps(
  etfs: EtfDailyFeatures[],
  previousByCode: Map<string, EtfRankingResult>,
  rpsPeriods: RpsPeriod[],
): Map<string, RpsRanking> {
  const result = new Map<string, RpsRanking>();

  for (const etf of etfs) {
    result.set(etf.code, {
      "1m": emptyRpsItem(),
      "3m": emptyRpsItem(),
      "6m": emptyRpsItem(),
      "1y": emptyRpsItem(),
    });
  }

  for (const period of rpsPeriods) {
    const ranked = calculateCrossSectionRank(
      etfs.map((etf) => ({
        code: etf.code,
        value: normalizeNumber(etf.periods[period]?.performance?.return),
      })),
      true,
    );

    for (const item of ranked) {
      const previous = previousByCode.get(item.code);

      const previousRps = previous?.rps?.[period]?.value ?? null;

      const previousRank = previous?.rps?.[period]?.rank ?? null;

      result.get(item.code)![period] = {
        value: item.percentile,
        return: item.value,
        rank: item.rank,
        previousRank,

        rankChange:
          item.rank !== null && previousRank !== null
            ? previousRank - item.rank
            : null,

        previousValue: previousRps,

        change:
          item.percentile !== null && previousRps !== null
            ? item.percentile - previousRps
            : null,
      };
    }
  }

  return result;
}

// ============================================================
// 11. 结果组装
// ============================================================

function getRankingItem(
  map: RankingMap,
  code: string,
  key: RankingMetricKey,
): RankingItem {
  return map.get(code)?.get(key) ?? emptyRankingItem();
}

function buildPerformanceRanking(
  code: string,
  map: RankingMap,
  periods: RankingPeriod[],
): PerformanceRanking {
  const output = {} as PerformanceRanking;

  for (const period of periods) {
    output[period] = {
      return: getRankingItem(map, code, `performance.${period}.return`),

      annualizedReturn: getRankingItem(
        map,
        code,
        `performance.${period}.annualizedReturn`,
      ),

      winRate: getRankingItem(map, code, `performance.${period}.winRate`),
    };
  }

  return output;
}

function buildRiskRanking(
  code: string,
  map: RankingMap,
  periods: RankingPeriod[],
): RiskRanking {
  const output = {} as RiskRanking;

  for (const period of periods) {
    output[period] = {
      volatility: getRankingItem(map, code, `risk.${period}.volatility`),

      downsideVolatility: getRankingItem(
        map,
        code,
        `risk.${period}.downsideVolatility`,
      ),

      maxDrawdown: getRankingItem(map, code, `risk.${period}.maxDrawdown`),

      currentDrawdown: getRankingItem(
        map,
        code,
        `risk.${period}.currentDrawdown`,
      ),

      var95: getRankingItem(map, code, `risk.${period}.var95`),

      cvar95: getRankingItem(map, code, `risk.${period}.cvar95`),

      maxDrawdownDuration: getRankingItem(
        map,
        code,
        `risk.${period}.maxDrawdownDuration`,
      ),

      currentDrawdownDuration: getRankingItem(
        map,
        code,
        `risk.${period}.currentDrawdownDuration`,
      ),
    };
  }

  return output;
}

function buildRiskAdjustedRanking(
  code: string,
  map: RankingMap,
  periods: RankingPeriod[],
): RiskAdjustedRanking {
  const output = {} as RiskAdjustedRanking;

  for (const period of periods) {
    output[period] = {
      sharpeRatio: getRankingItem(
        map,
        code,
        `riskAdjusted.${period}.sharpeRatio`,
      ),

      sortinoRatio: getRankingItem(
        map,
        code,
        `riskAdjusted.${period}.sortinoRatio`,
      ),

      calmarRatio: getRankingItem(
        map,
        code,
        `riskAdjusted.${period}.calmarRatio`,
      ),
    };
  }

  return output;
}

function buildValuationRanking(
  code: string,
  map: RankingMap,
): ValuationRanking {
  return {
    pe: getRankingItem(map, code, "valuation.pe"),
    pb: getRankingItem(map, code, "valuation.pb"),
    ps: getRankingItem(map, code, "valuation.ps"),
  };
}

// ============================================================
// 12. 排行榜总览
// ============================================================

function toOverviewItem(code: string, item: RankingItem): RankingOverviewItem {
  return {
    code,
    value: item.value,
    rank: item.rank,
    previousRank: item.previousRank,
    rankChange: item.rankChange,
    percentile: item.percentile,
  };
}

function sortOverviewItems(
  items: RankingOverviewItem[],
): RankingOverviewItem[] {
  return [...items].sort((a, b) => {
    if (a.rank === null && b.rank === null) {
      return a.code.localeCompare(b.code);
    }

    if (a.rank === null) return 1;
    if (b.rank === null) return -1;

    return a.rank - b.rank;
  });
}

function buildRankingOverview(
  items: EtfRankingResult[],
  periods: RankingPeriod[],
): RankingOverview {
  const rankings: RankingOverview = {};

  const collect = (
    key: string,
    getItem: (item: EtfRankingResult) => RankingItem,
  ) => {
    rankings[key] = sortOverviewItems(
      items.map((item) => toOverviewItem(item.code, getItem(item))),
    );
  };

  // Performance
  for (const period of periods) {
    for (const metric of PERFORMANCE_METRICS) {
      collect(
        `performance.${period}.${metric}`,
        (item) => item.performance[period][metric],
      );
    }
  }

  // Risk
  for (const period of periods) {
    for (const metric of RISK_METRICS) {
      collect(`risk.${period}.${metric}`, (item) => item.risk[period][metric]);
    }
  }

  // Risk Adjusted
  for (const period of periods) {
    for (const metric of RISK_ADJUSTED_METRICS) {
      collect(
        `riskAdjusted.${period}.${metric}`,
        (item) => item.riskAdjusted[period][metric],
      );
    }
  }

  // Valuation
  for (const metric of VALUATION_METRICS) {
    collect(`valuation.${metric}`, (item) => item.valuation[metric]);
  }

  // RPS
  for (const period of DEFAULT_RPS_PERIODS) {
    rankings[`rps.${period}`] = sortOverviewItems(
      items.map((item) => ({
        code: item.code,
        value: item.rps[period].value,
        rank: item.rps[period].rank,
        previousRank: item.rps[period].previousRank,
        rankChange: item.rps[period].rankChange,
        percentile: item.rps[period].value,
      })),
    );
  }

  return rankings;
}

// ============================================================
// 13. 统计
// ============================================================

function hasAnyOrdinaryRank(item: EtfRankingResult): boolean {
  const groups = [
    ...Object.values(item.performance),
    ...Object.values(item.risk),
    ...Object.values(item.riskAdjusted),
    Object.values(item.valuation),
  ];

  return groups.some((group) =>
    Object.values(group).some((metric) => metric.rank !== null),
  );
}

// ============================================================
// 14. 对外接口
// ============================================================

/**
 * ETF 横截面排名。
 *
 * @param etfs 同一交易日的 ETF 日度特征
 * @param options 排名配置
 * @param previousRanking 上一交易日排名快照
 *
 * previousRanking 由调用方从数据库读取。
 * 本引擎不访问数据库，只负责纯计算。
 */
export function rankEtfs(
  etfs: EtfDailyFeatures[],
  options: RankingOptions = {},
  previousRanking?: EtfRankingResult[],
): RankingEngineResult {
  const date = assertValidInputs(etfs, previousRanking);

  const previousByCode = indexPreviousRanking(previousRanking);

  const periods = Object.keys(etfs[0].periods) as RankingPeriod[];

  // 计算各指标排名
  const metricRankings = calculateAllMetricRankings(
    etfs,
    previousByCode,
    options,
  );

  // 计算 RPS
  const requestedRpsPeriods = options.rpsPeriods ?? [...DEFAULT_RPS_PERIODS];

  const validRpsPeriods = [...new Set(requestedRpsPeriods)].filter((period) =>
    DEFAULT_RPS_PERIODS.includes(period),
  );

  const rpsRankings = calculateRps(etfs, previousByCode, validRpsPeriods);

  // 组装每只 ETF 的排名结果
  const items: EtfRankingResult[] = etfs.map((etf) => ({
    code: etf.code,
    date,

    performance: buildPerformanceRanking(etf.code, metricRankings, periods),

    risk: buildRiskRanking(etf.code, metricRankings, periods),

    riskAdjusted: buildRiskAdjustedRanking(etf.code, metricRankings, periods),

    valuation: buildValuationRanking(etf.code, metricRankings),

    rps: rpsRankings.get(etf.code)!,
  }));

  // 列表默认按 1m 收益排名排序。
  // 仅作为展示顺序，不代表综合排名。
  items.sort((a, b) => {
    const rankA = a.performance["1m"].return.rank;
    const rankB = b.performance["1m"].return.rank;

    if (rankA === null && rankB === null) {
      return a.code.localeCompare(b.code);
    }

    if (rankA === null) return 1;
    if (rankB === null) return -1;

    return rankA - rankB;
  });

  const previousDate = previousRanking?.length ? previousRanking[0].date : null;

  return {
    summary: {
      date,
      previousDate,
      totalEtfs: etfs.length,

      rankedEtfs: items.filter(hasAnyOrdinaryRank).length,

      rpsUniverse: "allEtfs",
    },

    items,

    rankings: buildRankingOverview(items, periods),
  };
}
