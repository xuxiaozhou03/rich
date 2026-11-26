/**
 * etfDailyFeatures.ts
 *
 * ETF 日度特征计算引擎
 *
 * 输入：
 *   Etf
 *   Kline[]
 *   Valuation[]
 *
 * 输出：
 *   EtfDailyFeatures
 *
 * 设计原则：
 * 1. Performance / Risk 按周期组织
 * 2. Performance / Risk 各自包含 value + analyze
 * 3. Technical 每个指标包含 value + analyze
 * 4. Valuation 每项估值包含 value + analyze
 * 5. Market 和 Metadata 只保存数据
 * 6. 不包含 Structure
 * 7. 不输出交易日数量
 * 8. 所有收益率、波动率、回撤等比例字段使用小数
 */

import { Etf, Kline, Valuation } from "@rich/db";
import { ATR, BollingerBands, EMA, MACD, RSI, SMA } from "trading-signals";

// ============================================================
// 1. 基础类型
// ============================================================

type NullableNumber = number | null;
type DateNumber = number;

export type PerformancePeriod =
  | "1w"
  | "1m"
  | "3m"
  | "6m"
  | "ytd"
  | "1y"
  | "2y"
  | "3y"
  | "5y"
  | "all";

const PERFORMANCE_PERIODS: readonly PerformancePeriod[] = [
  "1w",
  "1m",
  "3m",
  "6m",
  "ytd",
  "1y",
  "2y",
  "3y",
  "5y",
  "all",
];

const PERFORMANCE_PERIOD_NAMES: Record<PerformancePeriod, string> = {
  "1w": "近1周",
  "1m": "近1月",
  "3m": "近3月",
  "6m": "近6月",
  ytd: "今年以来",
  "1y": "近1年",
  "2y": "近2年",
  "3y": "近3年",
  "5y": "近5年",
  all: "成立以来",
};

// ============================================================
// 2. 输入类型
// ============================================================

export interface CalculateOptions {
  /** 年化无风险利率，默认 0 */
  riskFreeRate?: number;

  /** 年化交易日数量，默认 252 */
  annualTradingDays?: number;

  /** 特征版本 */
  featureVersion?: string;
}

// ============================================================
// 3. 输出类型
// ============================================================

export interface EtfDailyFeatures {
  code: string;
  date: DateNumber;

  market: MarketFeatures;

  periods: Record<PerformancePeriod, PeriodFeatures>;

  technical: TechnicalFeatures;

  valuation: ValuationFeatures;
}

// ============================================================
// 4. Market 行情特征
// ============================================================

export interface MarketFeatures {
  open: NullableNumber;
  high: NullableNumber;
  low: NullableNumber;
  close: NullableNumber;

  volume: NullableNumber;
  amount: NullableNumber;

  change: NullableNumber;
  changePercent: NullableNumber;

  /** 振幅 */
  amplitude: NullableNumber;

  /** 根据前复权收盘价计算的日收益率 */
  return: NullableNumber;

  /** K线实体长度 */
  body: NullableNumber;

  /** K线实体占振幅比例 */
  bodyRatio: NullableNumber;

  upperShadow: NullableNumber;
  lowerShadow: NullableNumber;

  upperShadowRatio: NullableNumber;
  lowerShadowRatio: NullableNumber;

  averageVolume20: NullableNumber;
  averageAmount20: NullableNumber;

  volumeRatio: NullableNumber;
  amountRatio: NullableNumber;
}

// ============================================================
// 5. Periods 周期表现
// ============================================================

export interface PeriodFeatures {
  performance: PeriodPerformance;
  performanceAnalyze: string | null;
  risk: PeriodRisk;
  riskAnalyze: string | null;
}

export interface PeriodPerformance {
  /** 区间累计收益率 */
  return: NullableNumber;

  /** 年化收益率 */
  annualizedReturn: NullableNumber;

  /** 区间平均日收益率 */
  averageDailyReturn: NullableNumber;

  /** 上涨交易日比例 */
  winRate: NullableNumber;

  /** 最大单日涨幅 */
  bestDailyReturn: NullableNumber;

  /** 最大单日跌幅 */
  worstDailyReturn: NullableNumber;
}

export interface PeriodRisk {
  /** 年化波动率 */
  volatility: NullableNumber;

  /** 年化下行波动率 */
  downsideVolatility: NullableNumber;

  /** 区间最大回撤 */
  maxDrawdown: NullableNumber;

  /** 当前回撤 */
  currentDrawdown: NullableNumber;

  /** 最大回撤持续自然日 */
  maxDrawdownDuration: NullableNumber;

  /** 当前回撤持续自然日 */
  currentDrawdownDuration: NullableNumber;

  /** 夏普比率 */
  sharpeRatio: NullableNumber;

  /** 索提诺比率 */
  sortinoRatio: NullableNumber;

  /** 卡玛比率 */
  calmarRatio: NullableNumber;

  /** 95% VaR，正数表示潜在损失 */
  var95: NullableNumber;

  /** 95% CVaR，正数表示尾部平均损失 */
  cvar95: NullableNumber;
}

// ============================================================
// 6. Technical 技术指标
// ============================================================

export interface TechnicalFeatures {
  movingAverages: MovingAverages;
  movingAveragesAnalyze: string | null;

  maDeviation: MovingAverageDeviation;
  maDeviationAnalyze: string | null;

  maDirection: MovingAverageDirection;
  maDirectionAnalyze: string | null;

  maArrangement: MovingAverageArrangement;
  maArrangementAnalyze: string | null;

  macd: MACDFeatures;
  macdAnalyze: string | null;

  rsi: RSIFeatures;
  rsiAnalyze: string | null;

  bollinger: BollingerFeatures;
  bollingerAnalyze: string | null;

  atr: ATRFeatures;
  atrAnalyze: string | null;

  trend: TrendFeatures;
  trendAnalyze: string | null;

  momentum: MomentumFeatures;
  momentumAnalyze: string | null;
}

export interface MovingAverages {
  ma5: NullableNumber;
  ma10: NullableNumber;
  ma20: NullableNumber;
  ma30: NullableNumber;
  ma60: NullableNumber;
  ma120: NullableNumber;
  ma250: NullableNumber;
}

export interface MovingAverageDeviation extends MovingAverages {}

export interface MovingAverageDirection extends MovingAverages {}

export interface MovingAverageArrangement {
  bullish: 0 | 1 | null;
  bearish: 0 | 1 | null;
}

export interface MACDFeatures {
  dif: NullableNumber;
  dea: NullableNumber;
  histogram: NullableNumber;
  previousHistogram: NullableNumber;
  difDeaDifference: NullableNumber;
}

export interface RSIFeatures {
  rsi6: NullableNumber;
  rsi12: NullableNumber;
  rsi24: NullableNumber;
}

export interface BollingerFeatures {
  upper: NullableNumber;
  middle: NullableNumber;
  lower: NullableNumber;
  bandwidth: NullableNumber;
  percentB: NullableNumber;
}

export interface ATRFeatures {
  atr14: NullableNumber;
  atr20: NullableNumber;
  atr14Percent: NullableNumber;
  atr20Percent: NullableNumber;
}

export interface TrendFeatures {
  shortTerm: NullableNumber;
  mediumTerm: NullableNumber;
  longTerm: NullableNumber;
}

export interface MomentumFeatures {
  momentum5: NullableNumber;
  momentum10: NullableNumber;
  momentum20: NullableNumber;
  momentum60: NullableNumber;
}

// ============================================================
// 7. Valuation 估值
// ============================================================

export interface ValuationFeatures {
  pe: ValuationMetric;
  peAnalyze: string | null;

  pb: ValuationMetric;
  pbAnalyze: string | null;

  ps: ValuationMetric;
  psAnalyze: string | null;
}

export interface ValuationMetric {
  value: NullableNumber;
  percentile: NullableNumber;
  peg: NullableNumber;
  dataDate: DateNumber | null;
}

// ============================================================
// 9. 通用工具函数
// ============================================================

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function safeDivide(numerator: number, denominator: number): NullableNumber {
  if (!isValidNumber(numerator) || !isValidNumber(denominator)) {
    return null;
  }

  if (denominator === 0) return null;

  return numerator / denominator;
}

function mean(values: number[]): NullableNumber {
  if (!values.length) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStdDev(values: number[]): NullableNumber {
  if (values.length < 2) return null;

  const avg = mean(values)!;

  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) /
    (values.length - 1);

  return Math.sqrt(variance);
}

function populationStdDev(values: number[]): NullableNumber {
  if (!values.length) return null;

  const avg = mean(values)!;

  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}

function quantile(values: number[], q: number): NullableNumber {
  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  if (lower === upper) return sorted[lower];

  const weight = position - lower;

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function dateToTimestamp(date: number): number {
  const text = String(date);

  return Date.UTC(
    Number(text.slice(0, 4)),
    Number(text.slice(4, 6)) - 1,
    Number(text.slice(6, 8)),
  );
}

function timestampToDate(timestamp: number): number {
  const date = new Date(timestamp);

  return (
    date.getUTCFullYear() * 10000 +
    (date.getUTCMonth() + 1) * 100 +
    date.getUTCDate()
  );
}

function addDays(date: number, days: number): number {
  return timestampToDate(dateToTimestamp(date) + days * 86400000);
}

function addMonths(date: number, months: number): number {
  const text = String(date);

  const year = Number(text.slice(0, 4));
  const month = Number(text.slice(4, 6));
  const day = Number(text.slice(6, 8));

  const targetMonth = month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;

  const lastDay = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0),
  ).getUTCDate();

  return (
    targetYear * 10000 + (normalizedMonth + 1) * 100 + Math.min(day, lastDay)
  );
}

function daysBetween(start: number, end: number): number {
  return Math.round((dateToTimestamp(end) - dateToTimestamp(start)) / 86400000);
}

function normalizeOptions(
  options: CalculateOptions = {},
): Required<CalculateOptions> {
  return {
    riskFreeRate: options.riskFreeRate ?? 0,
    annualTradingDays: options.annualTradingDays ?? 252,
    featureVersion: options.featureVersion ?? "1.0.0",
  };
}

// ============================================================
// 10. Market 行情计算
// ============================================================

function calculateMarket(klines: Kline[], index: number): MarketFeatures {
  const current = klines[index];
  const previous = klines[index - 1];

  const dailyReturn =
    previous && previous.close > 0 ? current.close / previous.close - 1 : null;

  const range = current.high - current.low;

  const amplitude =
    previous && previous.close > 0 ? range / previous.close : null;

  const body = current.close - current.open;

  const upperShadow = current.high - Math.max(current.open, current.close);

  const lowerShadow = Math.min(current.open, current.close) - current.low;

  const volumeHistory = klines.slice(Math.max(0, index - 20), index);

  const averageVolume20 =
    volumeHistory.length === 20
      ? mean(volumeHistory.map((item) => item.volume))
      : null;

  const averageAmount20 =
    volumeHistory.length === 20
      ? mean(volumeHistory.map((item) => item.amount))
      : null;

  return {
    open: current.open,
    high: current.high,
    low: current.low,
    close: current.close,

    volume: current.volume,
    amount: current.amount,

    change: current.change,
    changePercent: current.changePercent,

    amplitude,
    return: dailyReturn,

    body,
    bodyRatio: safeDivide(body, range),

    upperShadow,
    lowerShadow,

    upperShadowRatio: safeDivide(upperShadow, range),
    lowerShadowRatio: safeDivide(lowerShadow, range),

    averageVolume20,
    averageAmount20,

    volumeRatio:
      averageVolume20 !== null
        ? safeDivide(current.volume, averageVolume20)
        : null,

    amountRatio:
      averageAmount20 !== null
        ? safeDivide(current.amount, averageAmount20)
        : null,
  };
}

// ============================================================
// 11. 周期计算
// ============================================================

function getPeriodStartDate(
  period: PerformancePeriod,
  currentDate: number,
): number | null {
  switch (period) {
    case "1w":
      return addDays(currentDate, -7);
    case "1m":
      return addMonths(currentDate, -1);
    case "3m":
      return addMonths(currentDate, -3);
    case "6m":
      return addMonths(currentDate, -6);
    case "ytd":
      return Math.floor(currentDate / 10000) * 10000 - 101;
    case "1y":
      return addMonths(currentDate, -12);
    case "2y":
      return addMonths(currentDate, -24);
    case "3y":
      return addMonths(currentDate, -36);
    case "5y":
      return addMonths(currentDate, -60);
    case "all":
      return null;
  }
}

function findBaselineIndex(
  klines: Kline[],
  startDate: number | null,
  currentIndex: number,
): number | null {
  if (startDate === null) return 0;

  for (let i = currentIndex - 1; i >= 0; i--) {
    if (klines[i].date <= startDate) return i;
  }

  return null;
}

function emptyPerformance(): PeriodPerformance {
  return {
    return: null,
    annualizedReturn: null,
    averageDailyReturn: null,
    winRate: null,
    bestDailyReturn: null,
    worstDailyReturn: null,
  };
}

function emptyRisk(): PeriodRisk {
  return {
    volatility: null,
    downsideVolatility: null,
    maxDrawdown: null,
    currentDrawdown: null,
    maxDrawdownDuration: null,
    currentDrawdownDuration: null,
    sharpeRatio: null,
    sortinoRatio: null,
    calmarRatio: null,
    var95: null,
    cvar95: null,
  };
}

function calculatePeriodValues(
  klines: Kline[],
  currentIndex: number,
  period: PerformancePeriod,
  options: Required<CalculateOptions>,
): {
  performance: PeriodPerformance;
  risk: PeriodRisk;
} {
  const current = klines[currentIndex];

  const startDate = getPeriodStartDate(period, current.date);

  const baselineIndex = findBaselineIndex(klines, startDate, currentIndex);

  if (baselineIndex === null) {
    return {
      performance: emptyPerformance(),
      risk: emptyRisk(),
    };
  }

  const baseline = klines[baselineIndex];

  if (baseline.close <= 0) {
    return {
      performance: emptyPerformance(),
      risk: emptyRisk(),
    };
  }

  const totalReturn = current.close / baseline.close - 1;

  const calendarDays = daysBetween(baseline.date, current.date);

  const items = klines.slice(baselineIndex, currentIndex + 1);

  const dailyReturns: number[] = [];

  for (let i = 1; i < items.length; i++) {
    const previousClose = items[i - 1].close;

    if (previousClose <= 0) continue;

    dailyReturns.push(items[i].close / previousClose - 1);
  }

  const averageDailyReturn = mean(dailyReturns);

  const annualizedReturn =
    calendarDays > 0 && totalReturn > -1
      ? Math.pow(1 + totalReturn, 365 / calendarDays) - 1
      : null;

  const performance: PeriodPerformance = {
    return: totalReturn,
    annualizedReturn,
    averageDailyReturn,

    winRate:
      dailyReturns.length > 0
        ? dailyReturns.filter((value) => value > 0).length / dailyReturns.length
        : null,

    bestDailyReturn: dailyReturns.length > 0 ? Math.max(...dailyReturns) : null,

    worstDailyReturn:
      dailyReturns.length > 0 ? Math.min(...dailyReturns) : null,
  };

  // 年化波动率
  const dailyStd = sampleStdDev(dailyReturns);

  const volatility =
    dailyStd !== null ? dailyStd * Math.sqrt(options.annualTradingDays) : null;

  // 年化下行波动率
  const downsideDeviation =
    dailyReturns.length > 0
      ? Math.sqrt(mean(dailyReturns.map((value) => Math.min(value, 0) ** 2))!)
      : null;

  const downsideVolatility =
    downsideDeviation !== null
      ? downsideDeviation * Math.sqrt(options.annualTradingDays)
      : null;

  // 最大回撤、当前回撤、回撤持续时间
  let peak = baseline.close;
  let peakDate = baseline.date;

  let maxDrawdown = 0;
  let maxDrawdownDuration = 0;

  let currentDrawdown = 0;
  let currentDrawdownDuration = 0;

  for (const item of items) {
    if (item.close > peak) {
      peak = item.close;
      peakDate = item.date;
    }

    const drawdown = item.close / peak - 1;

    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownDuration = daysBetween(peakDate, item.date);
    }

    currentDrawdown = drawdown;

    currentDrawdownDuration =
      drawdown < 0 ? daysBetween(peakDate, item.date) : 0;
  }

  // 夏普比率
  const dailyRiskFreeRate =
    Math.pow(1 + options.riskFreeRate, 1 / options.annualTradingDays) - 1;

  const excessReturns = dailyReturns.map((value) => value - dailyRiskFreeRate);

  const averageExcessReturn = mean(excessReturns);

  const sharpeRatio =
    averageExcessReturn !== null && dailyStd !== null && dailyStd > 0
      ? (averageExcessReturn / dailyStd) * Math.sqrt(options.annualTradingDays)
      : null;

  // 索提诺比率
  const annualizedExcessReturn =
    averageExcessReturn !== null
      ? averageExcessReturn * options.annualTradingDays
      : null;

  const sortinoRatio =
    annualizedExcessReturn !== null &&
    downsideVolatility !== null &&
    downsideVolatility > 0
      ? annualizedExcessReturn / downsideVolatility
      : null;

  // 卡玛比率
  const calmarRatio =
    annualizedReturn !== null && maxDrawdown < 0
      ? annualizedReturn / Math.abs(maxDrawdown)
      : null;

  // VaR / CVaR，历史模拟法
  const q05 = quantile(dailyReturns, 0.05);

  const var95 = q05 !== null ? Math.max(0, -q05) : null;

  const tailReturns =
    q05 !== null ? dailyReturns.filter((value) => value <= q05) : [];

  const cvar95 =
    tailReturns.length > 0 ? Math.max(0, -mean(tailReturns)!) : null;

  const risk: PeriodRisk = {
    volatility,
    downsideVolatility,
    maxDrawdown,
    currentDrawdown,
    maxDrawdownDuration,
    currentDrawdownDuration,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    var95,
    cvar95,
  };

  return { performance, risk };
}

// ============================================================
// 12. Performance 分析文案
// ============================================================

function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function analyzePerformance(
  value: PeriodPerformance,
  period: PerformancePeriod,
): string | null {
  if (value.return === null) return null;

  const name = PERFORMANCE_PERIOD_NAMES[period];
  const returnText = formatPercent(value.return);

  let conclusion: string;

  if (value.return >= 0.15) {
    conclusion = "区间收益表现突出";
  } else if (value.return >= 0.05) {
    conclusion = "区间收益表现较好";
  } else if (value.return > 0) {
    conclusion = "区间取得正收益，但涨幅相对有限";
  } else if (value.return <= -0.15) {
    conclusion = "区间出现较大幅度下跌";
  } else if (value.return <= -0.05) {
    conclusion = "区间收益表现偏弱";
  } else {
    conclusion = "区间收益接近持平，略有亏损";
  }

  let text = `${name}累计收益${returnText}，${conclusion}。`;

  if (value.winRate !== null) {
    text += `上涨交易日占比${formatPercent(value.winRate)}。`;
  }

  if (value.bestDailyReturn !== null && value.worstDailyReturn !== null) {
    text +=
      `期间最大单日涨幅${formatPercent(value.bestDailyReturn)}，` +
      `最大单日跌幅${formatPercent(value.worstDailyReturn)}。`;
  }

  return text;
}

// ============================================================
// 13. Risk 分析文案
// ============================================================

function analyzeRisk(
  value: PeriodRisk,
  period: PerformancePeriod,
): string | null {
  if (value.volatility === null && value.maxDrawdown === null) {
    return null;
  }

  const name = PERFORMANCE_PERIOD_NAMES[period];
  const parts: string[] = [];

  if (value.volatility !== null) {
    let level: string;

    if (value.volatility < 0.1) {
      level = "波动较低";
    } else if (value.volatility < 0.2) {
      level = "波动相对适中";
    } else if (value.volatility < 0.35) {
      level = "波动较为明显";
    } else {
      level = "波动较高";
    }

    parts.push(`年化波动率${formatPercent(value.volatility)}，${level}`);
  }

  if (value.maxDrawdown !== null) {
    parts.push(`最大回撤${formatPercent(value.maxDrawdown)}`);
  }

  if (value.currentDrawdown !== null) {
    parts.push(`当前回撤${formatPercent(value.currentDrawdown)}`);
  }

  if (value.sharpeRatio !== null) {
    let sharpeText: string;

    if (value.sharpeRatio >= 2) {
      sharpeText = "风险调整后收益表现优秀";
    } else if (value.sharpeRatio >= 1) {
      sharpeText = "风险调整后收益表现较好";
    } else if (value.sharpeRatio >= 0) {
      sharpeText = "风险调整后收益表现一般";
    } else {
      sharpeText = "风险调整后收益为负";
    }

    parts.push(`夏普比率${value.sharpeRatio.toFixed(2)}，${sharpeText}`);
  }

  return `${name}${parts.join("，")}。`;
}

// ============================================================
// 14-20. Technical 指标计算：统一使用 trading-signals
// ============================================================

const MA_PERIODS = [5, 10, 20, 30, 60, 120, 250] as const;

/**
 * 计算收盘价相对各周期均线的偏离率。
 * 正数表示收盘价高于均线，负数表示收盘价低于均线。
 */
function calculateMADeviation(
  close: number,
  ma: MovingAverages,
): MovingAverageDeviation {
  const deviation = (value: NullableNumber): NullableNumber => {
    if (value === null || value === 0 || !Number.isFinite(close)) return null;
    return close / value - 1;
  };

  return {
    ma5: deviation(ma.ma5),
    ma10: deviation(ma.ma10),
    ma20: deviation(ma.ma20),
    ma30: deviation(ma.ma30),
    ma60: deviation(ma.ma60),
    ma120: deviation(ma.ma120),
    ma250: deviation(ma.ma250),
  };
}

/**
 * 判断 MA5、MA10、MA20、MA60 是否形成多头或空头排列。
 * 任意一条均线尚未形成时，结果为 null。
 */
function calculateMAArrangement(ma: MovingAverages): MovingAverageArrangement {
  const { ma5, ma10, ma20, ma60 } = ma;

  if (ma5 === null || ma10 === null || ma20 === null || ma60 === null) {
    return { bullish: null, bearish: null };
  }

  const bullish = ma5 > ma10 && ma10 > ma20 && ma20 > ma60;
  const bearish = ma5 < ma10 && ma10 < ma20 && ma20 < ma60;

  return {
    bullish: bullish ? 1 : 0,
    bearish: bearish ? 1 : 0,
  };
}

/**
 * trading-signals 的结果使用 Big.js 精度对象；这里统一转换为 number | null。
 * 不在业务层重新实现指标算法。
 */
function indicatorNumber(value: unknown): NullableNumber {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object") {
    const candidate = value as {
      toNumber?: () => number;
      valueOf?: () => unknown;
    };
    if (typeof candidate.toNumber === "function") {
      const parsed = candidate.toNumber();
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (typeof candidate.valueOf === "function") {
      const raw = candidate.valueOf();
      if (typeof raw === "number" && Number.isFinite(raw)) return raw;
      if (typeof raw === "string") {
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
      }
    }
  }
  return null;
}

/**
 * 兼容 trading-signals 不同指标的结果对象结构。
 * 只做字段读取与类型转换，不参与指标计算。
 */
function indicatorField(result: unknown, ...keys: string[]): NullableNumber {
  if (result === null || typeof result !== "object") return null;
  const record = result as Record<string, unknown>;
  for (const key of keys) {
    if (key in record) return indicatorNumber(record[key]);
  }
  return null;
}

function addIndicatorValue(indicator: unknown, value: unknown): void {
  const target = indicator as { add: (input: unknown) => unknown };
  target.add(value);
}

function getIndicatorResult(indicator: unknown): unknown {
  const target = indicator as { getResult: () => unknown };
  try {
    return target.getResult();
  } catch {
    return null;
  }
}

export interface TechnicalIndicatorSnapshot {
  movingAverages: MovingAverages;
  maDirection: MovingAverageDirection;
  macd: MACDFeatures;
  rsi: RSIFeatures;
  bollinger: BollingerFeatures;
  atr: ATRFeatures;
  trend: TrendFeatures;
  momentum: MomentumFeatures;
}

/**
 * 顺序扫描截至目标日期的 K 线。
 * 每个指标只实例化一次，避免原实现中每个交易日都重新计算整段历史。
 */
function calculateTechnicalSnapshot(
  klines: Kline[],
  index: number,
): TechnicalIndicatorSnapshot {
  const smaIndicators = new Map<number, InstanceType<typeof SMA>>();
  for (const period of MA_PERIODS) {
    smaIndicators.set(period, new SMA(period));
  }

  const rsiIndicators = new Map<number, InstanceType<typeof RSI>>([
    [6, new RSI(6)],
    [12, new RSI(12)],
    [24, new RSI(24)],
  ]);

  const macdIndicator = new MACD(new EMA(12), new EMA(26), new EMA(9));
  const bollingerIndicator = new BollingerBands(20, 2);
  const atr14Indicator = new ATR(14);
  const atr20Indicator = new ATR(20);

  const maHistory = new Map<number, NullableNumber[]>();
  for (const period of MA_PERIODS) maHistory.set(period, []);

  let previousMacdHistogram: NullableNumber = null;
  let currentMacd: MACDFeatures = {
    dif: null,
    dea: null,
    histogram: null,
    previousHistogram: null,
    difDeaDifference: null,
  };

  let currentRsi: RSIFeatures = { rsi6: null, rsi12: null, rsi24: null };
  let currentBollinger: BollingerFeatures = {
    upper: null,
    middle: null,
    lower: null,
    bandwidth: null,
    percentB: null,
  };
  let currentAtr14: NullableNumber = null;
  let currentAtr20: NullableNumber = null;

  const closes: number[] = [];

  for (let i = 0; i <= index; i++) {
    const candle = klines[i];
    closes.push(candle.close);

    for (const [period, indicator] of smaIndicators) {
      addIndicatorValue(indicator, candle.close);
      maHistory
        .get(period)!
        .push(indicatorNumber(getIndicatorResult(indicator)));
    }

    for (const [period, indicator] of rsiIndicators) {
      addIndicatorValue(indicator, candle.close);
      const value = indicatorNumber(getIndicatorResult(indicator));
      if (period === 6) currentRsi.rsi6 = value;
      if (period === 12) currentRsi.rsi12 = value;
      if (period === 24) currentRsi.rsi24 = value;
    }

    addIndicatorValue(macdIndicator, candle.close);
    const macdResult = getIndicatorResult(macdIndicator);
    const dif = indicatorField(macdResult, "macd", "dif", "value");
    const dea = indicatorField(macdResult, "signal", "dea");
    const histogram = indicatorField(macdResult, "histogram", "hist");
    currentMacd = {
      dif,
      dea,
      histogram,
      previousHistogram: previousMacdHistogram,
      difDeaDifference: dif !== null && dea !== null ? dif - dea : null,
    };
    if (histogram !== null) previousMacdHistogram = histogram;

    addIndicatorValue(bollingerIndicator, candle.close);
    const bands = getIndicatorResult(bollingerIndicator);
    const upper = indicatorField(bands, "upper", "high");
    const middle = indicatorField(bands, "middle", "mid", "sma");
    const lower = indicatorField(bands, "lower", "low");
    currentBollinger = {
      upper,
      middle,
      lower,
      bandwidth:
        upper !== null && lower !== null && middle !== null && middle !== 0
          ? (upper - lower) / middle
          : null,
      percentB:
        upper !== null && lower !== null && upper !== lower
          ? (candle.close - lower) / (upper - lower)
          : null,
    };

    // ATR 使用完整 OHLC candle，TR 与 Wilder 平滑由 trading-signals 负责。
    const atrInput = {
      high: candle.high,
      low: candle.low,
      close: candle.close,
    };
    addIndicatorValue(atr14Indicator, atrInput);
    addIndicatorValue(atr20Indicator, atrInput);
    currentAtr14 = indicatorNumber(getIndicatorResult(atr14Indicator));
    currentAtr20 = indicatorNumber(getIndicatorResult(atr20Indicator));
  }

  const maValue = (period: number): NullableNumber =>
    maHistory.get(period)?.[index] ?? null;
  const maPreviousValue = (period: number, offset: number): NullableNumber =>
    maHistory.get(period)?.[index - offset] ?? null;

  const movingAverages: MovingAverages = {
    ma5: maValue(5),
    ma10: maValue(10),
    ma20: maValue(20),
    ma30: maValue(30),
    ma60: maValue(60),
    ma120: maValue(120),
    ma250: maValue(250),
  };

  const direction = (period: number): NullableNumber => {
    const current = maValue(period);
    const previous = maPreviousValue(period, 5);
    return current !== null && previous !== null && previous !== 0
      ? current / previous - 1
      : null;
  };

  const maDirection: MovingAverageDirection = {
    ma5: direction(5),
    ma10: direction(10),
    ma20: direction(20),
    ma30: direction(30),
    ma60: direction(60),
    ma120: direction(120),
    ma250: direction(250),
  };

  const close = klines[index].close;
  const atr: ATRFeatures = {
    atr14: currentAtr14,
    atr20: currentAtr20,
    atr14Percent:
      currentAtr14 !== null && close !== 0 ? currentAtr14 / close : null,
    atr20Percent:
      currentAtr20 !== null && close !== 0 ? currentAtr20 / close : null,
  };

  const trendSlope = (period: number, offset: number): NullableNumber => {
    const current = maValue(period);
    const previous = maPreviousValue(period, offset);
    return current !== null && previous !== null && previous !== 0
      ? current / previous - 1
      : null;
  };

  const momentum = (period: number): NullableNumber =>
    index >= period && closes[index - period] !== 0
      ? closes[index] / closes[index - period] - 1
      : null;

  return {
    movingAverages,
    maDirection,
    macd: currentMacd,
    rsi: currentRsi,
    bollinger: currentBollinger,
    atr,
    trend: {
      shortTerm: trendSlope(20, 5),
      mediumTerm: trendSlope(60, 20),
      longTerm: trendSlope(120, 60),
    },
    momentum: {
      momentum5: momentum(5),
      momentum10: momentum(10),
      momentum20: momentum(20),
      momentum60: momentum(60),
    },
  };
}

// ============================================================
// 21. Technical 分析文案
// ============================================================

function analyzeMovingAverages(value: MovingAverages): string | null {
  const { ma5, ma10, ma20, ma60 } = value;

  if ([ma5, ma10, ma20, ma60].some((v) => v === null)) {
    return null;
  }

  if (ma5! > ma10! && ma10! > ma20! && ma20! > ma60!) {
    return "短中期均线呈多头排列，均线系统整体偏强。";
  }

  if (ma5! < ma10! && ma10! < ma20! && ma20! < ma60!) {
    return "短中期均线呈空头排列，均线系统整体偏弱。";
  }

  return "短中期均线排列不一致，当前趋势方向尚不明确。";
}

function analyzeMADeviation(value: MovingAverageDeviation): string | null {
  if (value.ma20 === null) return null;

  if (value.ma20 > 0.05) {
    return "收盘价明显高于20日均线，短期存在一定偏离。";
  }

  if (value.ma20 > 0) {
    return "收盘价位于20日均线上方。";
  }

  if (value.ma20 < -0.05) {
    return "收盘价明显低于20日均线，价格处于相对弱势区间。";
  }

  return "收盘价位于20日均线附近或略低于均线。";
}

function analyzeMADirection(value: MovingAverageDirection): string | null {
  if (value.ma20 === null) return null;

  if (value.ma20 > 0.01) {
    return "20日均线方向向上，短期均线趋势偏强。";
  }

  if (value.ma20 < -0.01) {
    return "20日均线方向向下，短期均线趋势偏弱。";
  }

  return "20日均线变化较小，短期趋势相对平缓。";
}

function analyzeMAArrangement(value: MovingAverageArrangement): string | null {
  if (value.bullish === null) return null;

  if (value.bullish === 1) return "MA5、MA10、MA20、MA60 呈多头排列。";
  if (value.bearish === 1) return "MA5、MA10、MA20、MA60 呈空头排列。";

  return "均线未形成明确的多头或空头排列。";
}

function analyzeMACD(value: MACDFeatures): string | null {
  if (value.dif === null || value.dea === null || value.histogram === null) {
    return null;
  }

  const aboveZero = value.dif > 0 && value.dea > 0;
  const bullish = value.dif > value.dea;

  if (bullish && aboveZero) {
    return value.previousHistogram !== null &&
      value.histogram > value.previousHistogram
      ? "DIF 位于 DEA 上方且处于零轴上方，MACD 多头动能增强。"
      : "DIF 位于 DEA 上方且处于零轴上方，整体偏多。";
  }

  if (bullish) {
    return "DIF 位于 DEA 上方，但仍处于零轴下方，短期出现偏多信号。";
  }

  if (!bullish && !aboveZero) {
    return "DIF 位于 DEA 下方且处于零轴下方，MACD 整体偏空。";
  }

  return "DIF 位于 DEA 下方，但仍处于零轴上方，短期动能有所减弱。";
}

function analyzeRSI(value: RSIFeatures): string | null {
  if (value.rsi6 === null || value.rsi12 === null) return null;

  if (value.rsi6 >= 80) {
    return "短期 RSI 处于高位，价格存在明显过热迹象。";
  }

  if (value.rsi6 >= 70) {
    return "短期 RSI 进入相对高位，需关注短期过热风险。";
  }

  if (value.rsi6 <= 20) {
    return "短期 RSI 处于低位，市场短期处于明显弱势状态。";
  }

  if (value.rsi6 <= 30) {
    return "短期 RSI 处于相对低位，市场短期偏弱。";
  }

  if (value.rsi6 > value.rsi12) {
    return "短期 RSI 高于中期 RSI，短期动能相对较强。";
  }

  return "RSI 处于相对中性区间，暂未出现明显极端状态。";
}

function analyzeBollinger(value: BollingerFeatures): string | null {
  if (value.percentB === null) return null;

  if (value.percentB > 1) {
    return "价格突破布林上轨，短期走势较强，同时需关注偏离风险。";
  }

  if (value.percentB >= 0.8) {
    return "价格接近布林上轨，处于布林通道相对强势区域。";
  }

  if (value.percentB >= 0.5) {
    return "价格位于布林中轨上方，处于相对强势区域。";
  }

  if (value.percentB >= 0.2) {
    return "价格位于布林中轨下方，处于相对弱势区域。";
  }

  if (value.percentB >= 0) {
    return "价格接近布林下轨，短期走势偏弱。";
  }

  return "价格跌破布林下轨，短期处于明显弱势区间。";
}

function analyzeATR(value: ATRFeatures): string | null {
  if (value.atr14Percent === null || value.atr20Percent === null) {
    return null;
  }

  const ratio = value.atr14Percent / value.atr20Percent;

  if (ratio > 1.2) {
    return "短期 ATR 高于中期水平，近期价格波动有所扩大。";
  }

  if (ratio < 0.8) {
    return "短期 ATR 低于中期水平，近期价格波动有所收窄。";
  }

  return "短期与中期 ATR 接近，价格波动水平相对稳定。";
}

function analyzeTrend(value: TrendFeatures): string | null {
  if (value.shortTerm === null || value.mediumTerm === null) {
    return null;
  }

  const longTerm = value.longTerm;

  if (
    value.shortTerm > 0 &&
    value.mediumTerm > 0 &&
    longTerm !== null &&
    longTerm > 0
  ) {
    return "短中长期趋势均向上，整体趋势保持偏强。";
  }

  if (
    value.shortTerm < 0 &&
    value.mediumTerm < 0 &&
    longTerm !== null &&
    longTerm < 0
  ) {
    return "短中长期趋势均向下，整体趋势偏弱。";
  }

  if (value.shortTerm > 0 && value.mediumTerm < 0) {
    return "短期趋势向上，但中期趋势仍向下，可能处于反弹阶段。";
  }

  if (value.shortTerm < 0 && value.mediumTerm > 0) {
    return "短期趋势转弱，但中期趋势仍向上，需关注趋势变化。";
  }

  return "不同周期趋势方向不完全一致，当前趋势存在分化。";
}

function analyzeMomentum(value: MomentumFeatures): string | null {
  if (value.momentum20 === null) return null;

  if (
    value.momentum5 !== null &&
    value.momentum5 > 0 &&
    value.momentum20 > 0 &&
    value.momentum60 !== null &&
    value.momentum60 > 0
  ) {
    return "短中长期动量均为正值，整体上涨动能较强。";
  }

  if (value.momentum5 !== null && value.momentum5 < 0 && value.momentum20 < 0) {
    return "短期和中期动量均为负值，整体上涨动能不足。";
  }

  return "不同周期动量表现存在分化，短期与中长期方向不完全一致。";
}

// ============================================================
// 22. Technical 总计算
// ============================================================

function calculateTechnical(klines: Kline[], index: number): TechnicalFeatures {
  const snapshot = calculateTechnicalSnapshot(klines, index);
  const maDeviation = calculateMADeviation(
    klines[index].close,
    snapshot.movingAverages,
  );
  const maArrangement = calculateMAArrangement(snapshot.movingAverages);

  return {
    movingAverages: snapshot.movingAverages,
    movingAveragesAnalyze: analyzeMovingAverages(snapshot.movingAverages),

    maDeviation,
    maDeviationAnalyze: analyzeMADeviation(maDeviation),

    maDirection: snapshot.maDirection,
    maDirectionAnalyze: analyzeMADirection(snapshot.maDirection),

    maArrangement,
    maArrangementAnalyze: analyzeMAArrangement(maArrangement),

    macd: snapshot.macd,
    macdAnalyze: analyzeMACD(snapshot.macd),

    rsi: snapshot.rsi,
    rsiAnalyze: analyzeRSI(snapshot.rsi),

    bollinger: snapshot.bollinger,
    bollingerAnalyze: analyzeBollinger(snapshot.bollinger),

    atr: snapshot.atr,
    atrAnalyze: analyzeATR(snapshot.atr),

    trend: snapshot.trend,
    trendAnalyze: analyzeTrend(snapshot.trend),

    momentum: snapshot.momentum,
    momentumAnalyze: analyzeMomentum(snapshot.momentum),
  };
}

// ============================================================
// 23. Valuation 估值计算和分析
// ============================================================

function calculateValuationMetric(
  valuations: Valuation[],
  indexCode: string,
  type: string,
  date: number,
): ValuationMetric {
  const matched = valuations
    .filter(
      (item) =>
        item.indexCode === indexCode &&
        item.type.toUpperCase() === type &&
        item.date <= date,
    )
    .sort((a, b) => b.date - a.date);

  const latest = matched[0];

  if (!latest) {
    return {
      value: null,
      percentile: null,
      peg: null,
      dataDate: null,
    };
  }

  return {
    value: latest.value,
    percentile: latest.percent!,
    peg: latest.peg!,
    dataDate: latest.date,
  };
}

function analyzeValuation(value: ValuationMetric, type: string): string | null {
  if (value.value === null) return null;

  if (value.percentile === null) {
    return `当前${type}为${value.value}，缺少历史百分位数据，暂无法判断其历史估值位置。`;
  }

  const percentile = value.percentile;

  if (percentile <= 10) {
    return `当前${type}处于历史${percentile}%分位，估值处于历史极低区域。`;
  }

  if (percentile <= 30) {
    return `当前${type}处于历史${percentile}%分位，估值相对偏低。`;
  }

  if (percentile <= 70) {
    return `当前${type}处于历史${percentile}%分位，估值处于历史中间区域。`;
  }

  if (percentile <= 90) {
    return `当前${type}处于历史${percentile}%分位，估值相对偏高。`;
  }

  return `当前${type}处于历史${percentile}%分位，估值处于历史极高区域。`;
}

function calculateValuation(
  etf: Etf,
  valuations: Valuation[],
  date: number,
): ValuationFeatures {
  const pe = calculateValuationMetric(valuations, etf.indexCode, "PE", date);

  const pb = calculateValuationMetric(valuations, etf.indexCode, "PB", date);

  const ps = calculateValuationMetric(valuations, etf.indexCode, "PS", date);

  return {
    pe,
    peAnalyze: analyzeValuation(pe, "PE"),

    pb,
    pbAnalyze: analyzeValuation(pb, "PB"),

    ps,
    psAnalyze: analyzeValuation(ps, "PS"),
  };
}

// ============================================================
// 24. 单日特征计算
// ============================================================

function calculateAtIndex(
  etf: Etf,
  klines: Kline[],
  valuations: Valuation[],
  index: number,
  options: Required<CalculateOptions>,
): EtfDailyFeatures {
  const current = klines[index];

  const market = calculateMarket(klines, index);

  const periods = {} as Record<PerformancePeriod, PeriodFeatures>;

  for (const period of PERFORMANCE_PERIODS) {
    const result = calculatePeriodValues(klines, index, period, options);

    periods[period] = {
      performance: result.performance,
      performanceAnalyze: analyzePerformance(result.performance, period),
      risk: result.risk,
      riskAnalyze: analyzeRisk(result.risk, period),
    };
  }

  const technical = calculateTechnical(klines, index);

  const valuation = calculateValuation(etf, valuations, current.date);

  const valuationDates = [
    valuation.pe.dataDate,
    valuation.pb.dataDate,
    valuation.ps.dataDate,
  ].filter((date): date is number => date !== null);

  const warnings: string[] = [];

  if (klines.length < 250) {
    warnings.push("历史行情不足250个交易日，部分长期技术指标可能为空");
  }

  if (market.averageVolume20 === null) {
    warnings.push("历史成交量不足20个交易日");
  }

  if (valuationDates.length === 0) {
    warnings.push("当前没有可用的指数估值数据");
  }

  return {
    code: etf.code,
    date: current.date,

    market,

    periods,

    technical,

    valuation,
  };
}

// ============================================================
// 25. 对外函数：计算指定日期
// ============================================================

/**
 * 计算某只 ETF 指定交易日的完整特征。
 *
 * date 不传时，默认计算最新交易日。
 *
 * 注意：
 * 必须传入目标日期之前的历史 K 线，
 * 否则滚动指标无法正确计算。
 */
export function calculateEtfDailyFeatures(
  etf: Etf,
  klines: Kline[],
  valuations: Valuation[] = [],
  date?: number,
  options: CalculateOptions = {},
): EtfDailyFeatures {
  const normalizedKlines = klines;

  if (!normalizedKlines.length) {
    throw new Error(`ETF ${etf.code} 没有有效的 K 线数据`);
  }

  const targetDate = date ?? normalizedKlines[normalizedKlines.length - 1].date;

  const index = normalizedKlines.findIndex((item) => item.date === targetDate);

  if (index === -1) {
    throw new Error(`ETF ${etf.code} 不存在交易日期 ${targetDate} 的 K 线`);
  }

  return calculateAtIndex(
    etf,
    normalizedKlines,
    valuations,
    index,
    normalizeOptions(options),
  );
}
