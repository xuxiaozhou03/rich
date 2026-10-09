import Link from "next/link";

import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import { listRuns, getEquity, parseMetrics } from "@/lib/runs";
import { formatDate, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const raw = query.ids;
  const selected = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(Boolean);

  const runs = await listRuns(30);
  const selectedRuns = runs.filter((run) => selected.includes(run.id));

  const equityByRun = await Promise.all(
    selectedRuns.map(async (run) => ({
      run,
      equity: await getEquity(run.id),
    })),
  );

  const series = equityByRun.map(({ run, equity }) => ({
    name: `${run.strategyId} · ${formatDate(run.startDate)}~${formatDate(run.endDate)}`,
    points: equity.map((point) => ({ date: point.date, value: point.nav })),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">策略对比</h1>
        <p className="mt-1 text-sm text-neutral-500">勾选多次回测，叠加净值曲线。</p>
      </div>

      <form className="space-y-4" method="get">
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                <th className="px-4 py-2 font-medium">选择</th>
                <th className="px-4 py-2 font-medium">策略</th>
                <th className="px-4 py-2 font-medium">区间</th>
                <th className="px-4 py-2 text-right font-medium">累计收益</th>
                <th className="px-4 py-2 text-right font-medium">最大回撤</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-neutral-500" colSpan={5}>
                    还没有回测记录。
                  </td>
                </tr>
              ) : (
                runs.map((run) => {
                  const metrics = parseMetrics(run.metrics);
                  return (
                    <tr key={run.id} className="border-b border-neutral-100 last:border-b-0">
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          name="ids"
                          value={run.id}
                          defaultChecked={selected.includes(run.id)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/runs/${run.id}`} className="hover:underline">
                          {run.strategyId}
                        </Link>
                        <span className="ml-2 font-mono text-xs text-neutral-400">
                          {run.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-4 py-2 tabular-nums text-neutral-600">
                        {formatDate(run.startDate)} ~ {formatDate(run.endDate)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {metrics ? formatPercent(metrics.totalReturn) : "-"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {metrics ? formatPercent(metrics.maxDrawdown) : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <button
          type="submit"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm text-white hover:bg-teal-800"
        >
          对比所选
        </button>
      </form>

      {series.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-900">净值叠加</h2>
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <TimeSeriesChart series={series} height={360} />
          </div>
        </section>
      ) : (
        <p className="text-sm text-neutral-500">选择至少一次回测以查看对比曲线。</p>
      )}
    </div>
  );
}
