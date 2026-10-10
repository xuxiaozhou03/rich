"use client";

import { useEffect, useRef, useState } from "react";

import type {
  Chart,
  DataLoader,
  DataLoadType,
  DeepPartial,
  KLineData as ChartKLineData,
  Period,
  Styles,
} from "klinecharts";

import type { KlineAdjust, KlineData, KlinePeriod } from "@/lib/kline";

const PAGE_SIZE = 500;
const PRICE_PRECISION = 3;

const PERIOD_OPTIONS: Array<{ value: KlinePeriod; label: string }> = [
  { value: "daily", label: "日 K" },
  { value: "weekly", label: "周 K" },
  { value: "monthly", label: "月 K" },
];

const ADJUST_OPTIONS: Array<{ value: KlineAdjust; label: string }> = [
  { value: "qfq", label: "前复权" },
  { value: "hfq", label: "后复权" },
  { value: "", label: "不复权" },
];

const CHART_STYLES: DeepPartial<Styles> = {
  grid: {
    horizontal: {
      color: "#e5e7eb",
      size: 1,
      style: "dashed",
    },
    vertical: {
      show: false,
    },
  },
  candle: {
    bar: {
      compareRule: "previous_close",
      upColor: "#dc2626",
      downColor: "#16a34a",
      noChangeColor: "#737373",
      upBorderColor: "#dc2626",
      downBorderColor: "#16a34a",
      noChangeBorderColor: "#737373",
      upWickColor: "#dc2626",
      downWickColor: "#16a34a",
      noChangeWickColor: "#737373",
    },
  },
  xAxis: {
    tickText: {
      color: "#737373",
      size: 11,
    },
  },
  yAxis: {
    tickText: {
      color: "#737373",
      size: 11,
    },
  },
  separator: {
    color: "#e5e7eb",
    size: 1,
  },
  crosshair: {
    horizontal: {
      line: {
        color: "#a3a3a3",
        size: 1,
        style: "dashed",
      },
    },
    vertical: {
      line: {
        color: "#a3a3a3",
        size: 1,
        style: "dashed",
      },
    },
  },
};

function toTimestamp(date: string): number {
  return Date.parse(date.length === 10 ? `${date}T00:00:00Z` : date);
}

function toDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function toChartKline(row: KlineData): ChartKLineData {
  return {
    timestamp: toTimestamp(row.date),
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
    turnover: row.amount,
    date: row.date,
    amount: row.amount,
    change: row.change,
    changePercent: row.changePercent,
  };
}

function toApiPeriod(period: Period): KlinePeriod {
  switch (period.type) {
    case "week":
      return "weekly";
    case "month":
      return "monthly";
    case "minute": {
      const minute = String(period.span);
      return ["1", "5", "15", "30", "60"].includes(minute)
        ? (minute as KlinePeriod)
        : "daily";
    }
    case "hour":
      return "60";
    case "day":
    default:
      return "daily";
  }
}

function toChartPeriod(period: KlinePeriod): Period {
  switch (period) {
    case "timeline":
    case "1":
      return { type: "minute", span: 1 };
    case "timeline5":
    case "5":
      return { type: "minute", span: 5 };
    case "15":
      return { type: "minute", span: 15 };
    case "30":
      return { type: "minute", span: 30 };
    case "60":
      return { type: "minute", span: 60 };
    case "weekly":
      return { type: "week", span: 1 };
    case "monthly":
      return { type: "month", span: 1 };
    case "daily":
    default:
      return { type: "day", span: 1 };
  }
}

async function fetchPage(
  symbol: string,
  period: Period,
  adjust: KlineAdjust,
  type: DataLoadType,
  timestamp: number | null,
): Promise<ChartKLineData[]> {
  const search = new URLSearchParams({
    symbol,
    period: toApiPeriod(period),
    adjust,
    limit: String(PAGE_SIZE),
  });

  if (timestamp !== null && type !== "init" && type !== "update") {
    const date = toDateString(timestamp);
    if (type === "forward") search.set("before", date);
    if (type === "backward") search.set("after", date);
  }

  const response = await fetch(`/api/kline?${search.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`K 线数据加载失败：${response.status}`);
  }

  const rows = (await response.json()) as KlineData[];
  return rows.map(toChartKline);
}

export interface KlineViewProps {
  symbol: string;
  height?: number;
  defaultPeriod?: KlinePeriod;
  defaultAdjust?: KlineAdjust;
}

export function KlineView({
  symbol,
  height = 520,
  defaultPeriod = "daily",
  defaultAdjust = "qfq",
}: KlineViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const periodRef = useRef<KlinePeriod>(defaultPeriod);
  const adjustRef = useRef<KlineAdjust>(defaultAdjust);
  const [period, setPeriod] = useState<KlinePeriod>(defaultPeriod);
  const [adjust, setAdjust] = useState<KlineAdjust>(defaultAdjust);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let chart: Chart | null = null;
    let disposeChart: ((target: Chart) => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;

    void import("klinecharts")
      .then(({ init, dispose }) => {
        if (cancelled) return;

        disposeChart = dispose;
        chart = init(container, {
          locale: "zh-CN",
          timezone: "Asia/Shanghai",
          styles: CHART_STYLES,
        });
        if (!chart) return;

        chartRef.current = chart;
        chart.setSymbol({
          ticker: symbol,
          pricePrecision: PRICE_PRECISION,
          volumePrecision: 0,
        });
        chart.setPeriod(toChartPeriod(periodRef.current));
        chart.createIndicator({
          name: "MA",
          paneId: "candle_pane",
          calcParams: [5, 10, 20, 30, 60],
        });
        chart.createIndicator({ name: "VOL" });
        chart.createIndicator({ name: "MACD" });

        const dataLoader: DataLoader = {
          getBars: async ({
            type,
            timestamp,
            symbol: chartSymbol,
            period: chartPeriod,
            callback,
          }) => {
            try {
              const rows = await fetchPage(
                chartSymbol.ticker,
                chartPeriod,
                adjustRef.current,
                type,
                timestamp,
              );
              if (cancelled) return;

              setError(null);
              const hasMore = rows.length >= PAGE_SIZE;
              callback(rows, {
                forward: (type === "init" || type === "forward") && hasMore,
                backward: type === "backward" && hasMore,
              });
            } catch (loadError) {
              if (cancelled) return;
              setError(
                loadError instanceof Error
                  ? loadError.message
                  : "K 线数据加载失败",
              );
              callback([], false);
            }
          },
        };

        chart.setDataLoader(dataLoader);

        resizeObserver = new ResizeObserver(() => {
          chart?.resize();
        });
        resizeObserver.observe(container);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error ? loadError.message : "K 线图加载失败",
        );
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      chartRef.current = null;
      if (chart && disposeChart) disposeChart(chart);
    };
  }, [symbol]);

  function selectPeriod(next: KlinePeriod) {
    if (next === period) return;
    periodRef.current = next;
    setPeriod(next);
    chartRef.current?.setPeriod(toChartPeriod(next));
  }

  function selectAdjust(next: KlineAdjust) {
    if (next === adjust) return;
    adjustRef.current = next;
    setAdjust(next);
    chartRef.current?.resetData();
  }

  return (
    <div className="flex w-full flex-col" style={{ height }}>
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-white px-2 py-1.5">
        <div className="flex overflow-hidden rounded border border-neutral-200">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`px-3 py-1 text-xs transition-colors ${
                period === option.value
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-500 hover:text-neutral-900"
              }`}
              aria-pressed={period === option.value}
              onClick={() => selectPeriod(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-neutral-200" />

        <div className="flex overflow-hidden rounded border border-neutral-200">
          {ADJUST_OPTIONS.map((option) => (
            <button
              key={option.value || "raw"}
              type="button"
              className={`px-3 py-1 text-xs transition-colors ${
                adjust === option.value
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-500 hover:text-neutral-900"
              }`}
              aria-pressed={adjust === option.value}
              onClick={() => selectAdjust(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-white"
      >
        {error ? (
          <div className="absolute inset-x-3 bottom-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
