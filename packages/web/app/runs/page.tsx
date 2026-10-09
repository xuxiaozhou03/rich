import Link from "next/link";

import { RunStatusBadge } from "@/components/RunStatusBadge";
import { formatDate, formatPercent } from "@/lib/format";
import { listRuns, parseMetrics } from "@/lib/runs";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await listRuns(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">回测记录</h1>
        <Link href="/backtest/new" className="text-sm text-teal-700 hover:underline">
          新建回测
        </Link>
      </div>

      {runs.length === 0 ? (
        <p className="text-sm text-neutral-500">还没有回测记录。</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                <th className="px-4 py-2 font-medium">策略</th>
                <th className="px-4 py-2 font-medium">区间</th>
                <th className="px-4 py-2 font-medium">状态</th>
                <th className="px-4 py-2 text-right font-medium">累计收益</th>
                <th className="px-4 py-2 text-right font-medium">年化</th>
                <th className="px-4 py-2 text-right font-medium">最大回撤</th>
                <th className="px-4 py-2 text-right font-medium">夏普</th>
                <th className="px-4 py-2 text-right font-medium">交易数</th>
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
                      {metrics ? formatPercent(metrics.annualReturn) : "-"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {metrics ? formatPercent(metrics.maxDrawdown) : "-"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {metrics ? metrics.sharpe.toFixed(2) : "-"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {metrics ? metrics.tradeCount : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
