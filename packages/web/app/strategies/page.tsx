import Link from "next/link";

import { strategies } from "@quant-backtest/strategies";

export default function StrategiesPage() {
  const list = Object.values(strategies);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">策略库</h1>
        <p className="mt-1 text-sm text-neutral-500">
          策略以 TypeScript 文件管理，通过 Git 沉淀与复现。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {list.map((strategy) => (
          <div
            key={strategy.id}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-4"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-medium">{strategy.name}</h2>
              <code className="text-xs text-neutral-400">{strategy.id}</code>
            </div>
            <p className="mt-1 text-sm text-neutral-600">{strategy.description}</p>
            <p className="mt-2 font-mono text-xs text-neutral-500">
              {JSON.stringify(strategy.defaultParams)}
            </p>
            <div className="mt-3 flex gap-4 text-sm">
              <Link href={`/strategies/${strategy.id}`} className="text-teal-700 hover:underline">
                详情
              </Link>
              <Link
                href={`/backtest/new?strategy=${strategy.id}`}
                className="text-neutral-500 hover:underline"
              >
                用它回测
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
