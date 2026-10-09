import Link from "next/link";
import { notFound } from "next/navigation";

import { strategies } from "@quant-backtest/strategies";

export default async function StrategyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const strategy = strategies[id];
  if (!strategy) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/strategies" className="text-sm text-neutral-500 hover:underline">
          ← 策略库
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{strategy.name}</h1>
        <code className="text-xs text-neutral-400">{strategy.id}</code>
      </div>

      <p className="max-w-2xl text-sm text-neutral-600">{strategy.description}</p>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">默认参数</h2>
        <pre className="overflow-x-auto rounded-lg border border-neutral-200 bg-white px-4 py-3 font-mono text-xs text-neutral-700">
          {JSON.stringify(strategy.defaultParams, null, 2)}
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">接口约定</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-neutral-600">
          <li>输入：`StrategyContext`（date / account / market / params）。</li>
          <li>输出：`TargetWeights`，权重和 ≤ 1，未列出的标的视为清仓。</li>
          <li>技术指标用前复权价，成交用原始价。</li>
        </ul>
      </section>

      <Link
        href={`/backtest/new?strategy=${strategy.id}`}
        className="inline-block rounded-md bg-teal-700 px-4 py-2 text-sm text-white hover:bg-teal-800"
      >
        用这个策略回测
      </Link>
    </div>
  );
}
