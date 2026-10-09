import { prisma } from "@quant-backtest/db";
import { strategies } from "@quant-backtest/strategies";

import { BacktestForm, type StrategyOption } from "@/components/BacktestForm";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function NewBacktestPage({
  searchParams,
}: {
  searchParams: Promise<{ strategy?: string }>;
}) {
  const { strategy } = await searchParams;
  const range = await prisma.kline.aggregate({ _min: { date: true }, _max: { date: true } });

  const list: StrategyOption[] = Object.values(strategies).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    defaultParams: item.defaultParams,
  }));

  const defaultStrategyId = strategy && strategies[strategy] ? strategy : list[0]?.id ?? "";
  const defaultStartDate = formatDate(range._min.date ?? 20200101);
  const defaultEndDate = formatDate(range._max.date ?? 20241231);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">新建回测</h1>
        <p className="mt-1 text-sm text-neutral-500">
          提交后立即在服务端运行，完成后跳转到结果页。
        </p>
      </div>
      <BacktestForm
        strategies={list}
        defaultStrategyId={defaultStrategyId}
        defaultStartDate={defaultStartDate}
        defaultEndDate={defaultEndDate}
      />
    </div>
  );
}
