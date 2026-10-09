"use client";

import dynamic from "next/dynamic";
import type { AdjustType, KLineDataProvider, PeriodType } from "kline-charts-react";

import "kline-charts-react/style.css";

const KLineChart = dynamic(
  () => import("kline-charts-react").then((mod) => mod.KLineChart),
  {
    ssr: false,
    loading: () => <div className="h-[520px] w-full animate-pulse rounded-lg bg-neutral-100" />,
  },
);

/**
 * 自有数据源：组件把 symbol / period / adjust / cursor / limit 原样传进来，
 * 我们转成对本地 /api/kline 的请求（数据来自 SQLite，不是 stock-sdk）。
 */
const localProvider: KLineDataProvider = {
  getKline: async (params, signal) => {
    const search = new URLSearchParams({
      symbol: params.symbol,
      period: params.period,
      adjust: params.adjust,
    });
    if (params.cursor !== undefined && params.cursor !== null) {
      search.set("before", String(params.cursor));
    }
    if (params.limit) search.set("limit", String(params.limit));

    const response = await fetch(`/api/kline?${search.toString()}`, { signal });
    if (!response.ok) {
      throw new Error(`K 线数据加载失败：${response.status}`);
    }
    return response.json();
  },
};

export interface KlineViewProps {
  symbol: string;
  height?: number;
  defaultPeriod?: PeriodType;
  defaultAdjust?: AdjustType;
}

export function KlineView({
  symbol,
  height = 520,
  defaultPeriod = "daily",
  defaultAdjust = "qfq",
}: KlineViewProps) {
  return (
    <div className="w-full" style={{ height }}>
      <KLineChart
        symbol={symbol}
        market="A"
        height={height}
        theme="light"
        defaultPeriod={defaultPeriod}
        defaultAdjust={defaultAdjust}
        defaultIndicators={["ma", "volume", "macd"]}
        dataProvider={localProvider}
      />
    </div>
  );
}
