"use client";

import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";

import { dateToUtc } from "@/lib/format";

export interface TimeSeries {
  name: string;
  points: { date: number; value: number }[];
  color?: string;
}

const PALETTE = ["#0f766e", "#b45309", "#4338ca", "#be123c", "#4d7c0f", "#0369a1"];

export interface TimeSeriesChartProps {
  series: TimeSeries[];
  height?: number;
  /** 数值格式（Server → Client 不能传函数，这里用枚举） */
  format?: "number" | "percent";
  /** format=number 时的小数位 */
  digits?: number;
  /** 是否画面积 */
  area?: boolean;
}

export function TimeSeriesChart({
  series,
  height = 280,
  format = "number",
  digits = 3,
  area = false,
}: TimeSeriesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const formatter = useMemo(
    () =>
      format === "percent"
        ? (value: number) => `${value.toFixed(1)}%`
        : (value: number) => value.toFixed(digits),
    [format, digits],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = echarts.init(container);
    chartRef.current = chart;
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setOption(
      {
        animation: false,
        grid: { left: 56, right: 16, top: series.length > 1 ? 36 : 16, bottom: 32 },
        legend:
          series.length > 1
            ? { top: 0, right: 0, textStyle: { color: "#525252", fontSize: 11 } }
            : undefined,
        tooltip: {
          trigger: "axis",
          valueFormatter: (value: unknown) => formatter(Number(value)),
        },
        xAxis: {
          type: "time",
          axisLine: { lineStyle: { color: "#d4d4d4" } },
          axisLabel: { color: "#737373", fontSize: 11 },
        },
        yAxis: {
          type: "value",
          scale: true,
          splitLine: { lineStyle: { color: "#eeeeee" } },
          axisLabel: { color: "#737373", fontSize: 11, formatter: (value: number) => formatter(value) },
        },
        series: series.map((item, index) => {
          const color = item.color ?? PALETTE[index % PALETTE.length];
          return {
            name: item.name,
            type: "line" as const,
            showSymbol: false,
            lineStyle: { width: 1.5, color },
            itemStyle: { color },
            areaStyle: area
              ? { color, opacity: 0.08 }
              : undefined,
            data: item.points.map((point) => [dateToUtc(point.date), point.value]),
          };
        }),
      },
      { notMerge: true },
    );
  }, [series, formatter, area]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}
