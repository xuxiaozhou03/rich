import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@quant-backtest/db";

import { KlineView } from "@/components/KlineView";
import { RunStatusBadge } from "@/components/RunStatusBadge";
import { StatCard } from "@/components/StatCard";
import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import { TradeTable } from "@/components/TradeTable";
import { formatDate, formatPercent } from "@/lib/format";
import { getEquity, getRun, getTrades, parseJson, parseMetrics } from "@/lib/runs";

export const dynamic = "force-dynamic";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await getRun(id);
  if (!run) notFound();

  const [equity, trades, sampleEtf] = await Promise.all([
    getEquity(id),
    getTrades(id),
    prisma.etf.findFirst({ orderBy: { code: "asc" } }),
  ]);
  const metrics = parseMetrics(run.metrics);
  const sampleCode = trades.find((trade) => trade.side === "buy")?.code ?? sampleEtf?.code ?? "510300.SH";

  const navSeries = [
    { name: "净值", points: equity.map((point) => ({ date: point.date, value: point.nav })) },
  ];
  const drawdownSeries = [
    {
      name: "回撤 %",
      points: equity.map((point) => ({ date: point.date, value: point.drawdown * 100 })),
      color: "#be123c",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/runs" className="text-sm text-neutral-500 hover:underline">
            ← 回测记录
          </Link>
          <h1 className="mt-2 text-xl font-semibold">{run.strategyId}</h1>
          <p className="mt-1 text-sm tabular-nums text-neutral-500">
            {formatDate(run.startDate)} ~ {formatDate(run.endDate)} · 初始资金{" "}
            {run.initCash.toLocaleString("zh-CN")}
          </p>
        </div>
        <RunStatusBadge status={run.status} />
      </div>

      {run.status === "failed" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {run.errorMessage ?? "回测失败"}
        </div>
      ) : null}

      {metrics ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-900">绩效指标</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <StatCard label="累计收益" value={formatPercent(metrics.totalReturn)} />
            <StatCard label="年化收益" value={formatPercent(metrics.annualReturn)} />
            <StatCard label="最大回撤" value={formatPercent(metrics.maxDrawdown)} />
            <StatCard
              label="回撤持续期"
              value={`${metrics.maxDrawdownDuration} 天`}
              hint="交易日"
            />
            <StatCard label="年化波动" value={formatPercent(metrics.annualVolatility)} />
            <StatCard label="夏普" value={metrics.sharpe.toFixed(2)} />
            <StatCard label="卡玛" value={metrics.calmar.toFixed(2)} />
            <StatCard label="索提诺" value={metrics.sortino.toFixed(2)} />
            <StatCard label="胜率" value={formatPercent(metrics.winRate)} />
            <StatCard label="盈亏比" value={metrics.profitLossRatio.toFixed(2)} />
            <StatCard label="盈利因子" value={metrics.profitFactor.toFixed(2)} />
            <StatCard label="换手率" value={metrics.turnover.toFixed(2)} />
            <StatCard label="交易次数" value={String(metrics.tradeCount)} />
            <StatCard label="平均持仓" value={`${metrics.avgHoldingDays.toFixed(1)} 天`} />
          </div>
        </section>
      ) : null}

      {equity.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-900">净值曲线</h2>
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <TimeSeriesChart series={navSeries} height={280} />
          </div>
        </section>
      ) : null}

      {equity.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-900">回撤</h2>
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <TimeSeriesChart series={drawdownSeries} height={200} area format="percent" />
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-900">行情（前复权）</h2>
          <span className="font-mono text-xs text-neutral-400">{sampleCode}</span>
        </div>
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-2">
          <KlineView symbol={sampleCode} height={480} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-900">交易流水</h2>
        <div className="rounded-lg border border-neutral-200 bg-white px-4 py-2">
          <TradeTable trades={trades} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-900">复现要素</h2>
        <pre className="overflow-x-auto rounded-lg border border-neutral-200 bg-white px-4 py-3 font-mono text-xs text-neutral-700">
          {JSON.stringify(
            {
              strategyId: run.strategyId,
              gitCommit: run.gitCommit,
              params: parseJson<Record<string, unknown>>(run.params, {}),
              universe: parseJson<unknown>(run.universe, null),
              costModel: parseJson<unknown>(run.costModel, null),
              adjustBaseDate: run.adjustBaseDate,
              adjustSnapshotHash: run.adjustSnapshotHash,
              dataVersion: run.dataVersion,
              createdAt: run.createdAt.toISOString(),
            },
            null,
            2,
          )}
        </pre>
      </section>
    </div>
  );
}
