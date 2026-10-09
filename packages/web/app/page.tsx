import Link from "next/link";

import { prisma } from "@quant-backtest/db";

import { RunStatusBadge } from "@/components/RunStatusBadge";
import { StatCard } from "@/components/StatCard";
import { formatDate, formatPercent } from "@/lib/format";
import { listRuns, parseMetrics } from "@/lib/runs";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [etfCount, klineCount, latest, runCount, runs] = await Promise.all([
    prisma.etf.count(),
    prisma.kline.count(),
    prisma.kline.aggregate({ _max: { date: true } }),
    prisma.backtestRun.count(),
    listRuns(6),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">总览</h1>
        <p className="mt-1 text-sm text-neutral-500">
          日 K 级别、ETF 全市场、可复现的策略回测平台。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="ETF 数量" value={String(etfCount)} />
        <StatCard
          label="K 线行数"
          value={klineCount.toLocaleString("zh-CN")}
          hint={latest._max.date ? `最新 ${formatDate(latest._max.date)}` : undefined}
        />
        <StatCard label="回测次数" value={String(runCount)} />
        <StatCard label="年化交易日" value="252" hint="默认年化口径" />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-900">最近的回测</h2>
          <div className="flex gap-3 text-sm">
            <Link href="/backtest/new" className="text-teal-700 hover:underline">
              新建回测
            </Link>
            <Link href="/runs" className="text-neutral-500 hover:underline">
              全部记录
            </Link>
          </div>
        </div>

        {runs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500">
            还没有回测记录，去
            <Link href="/backtest/new" className="mx-1 text-teal-700 hover:underline">
              新建一个
            </Link>
            。
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                  <th className="px-4 py-2 font-medium">策略</th>
                  <th className="px-4 py-2 font-medium">区间</th>
                  <th className="px-4 py-2 font-medium">状态</th>
                  <th className="px-4 py-2 text-right font-medium">累计收益</th>
                  <th className="px-4 py-2 text-right font-medium">最大回撤</th>
                  <th className="px-4 py-2 text-right font-medium">夏普</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const metrics = parseMetrics(run.metrics);
                  return (
                    <tr key={run.id} className="border-b border-neutral-100 last:border-b-0">
                      <td className="px-4 py-2">
                        <Link href={`/runs/${run.id}`} className="hover:underline">
                          {run.strategyId}
                        </Link>
                      </td>
                      <td className="px-4 py-2 tabular-nums text-neutral-600">
                        {formatDate(run.startDate)} ~ {formatDate(run.endDate)}
                      </td>
                      <td className="px-4 py-2">
                        <RunStatusBadge status={run.status} />
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {metrics ? formatPercent(metrics.totalReturn) : "-"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {metrics ? formatPercent(metrics.maxDrawdown) : "-"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {metrics ? metrics.sharpe.toFixed(2) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
