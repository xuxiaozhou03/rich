import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@quant-backtest/db";

import { KlineView } from "@/components/KlineView";
import { StatCard } from "@/components/StatCard";
import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import { formatDate, formatNumber, formatYi } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EtfDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const etf = await prisma.etf.findUnique({ where: { code } });
  if (!etf) notFound();

  const [recent, firstKline, holdings, holdingCount, links] = await Promise.all([
    prisma.kline.findMany({
      where: { code },
      orderBy: { date: "desc" },
      take: 2,
    }),
    prisma.kline.findFirst({
      where: { code },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
    prisma.etfHolding.findMany({
      where: { etfCode: code },
      orderBy: { holdScale: "desc" },
      take: 20,
    }),
    prisma.etfHolding.count({ where: { etfCode: code } }),
    prisma.linkEtf.findMany({
      where: { target: code },
      orderBy: { similar: "desc" },
      take: 12,
    }),
  ]);

  const [latest = null] = recent;
  const [shares, relatedEtfs] = await Promise.all([
    prisma.etfFloatShare.findMany({
      where: { code },
      orderBy: { date: "asc" },
    }),
    links.length > 0
      ? prisma.etf.findMany({
          where: { code: { in: links.map((link) => link.source) } },
          select: { code: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const relatedNameByCode = new Map(
    relatedEtfs.map((item) => [item.code, item.name]),
  );
  const latestShare = shares.length > 0 ? shares[shares.length - 1] : null;

  const shareSeries = [
    {
      name: "份额（亿份）",
      points: shares.map((row) => ({ date: row.date, value: row.shares / 1e8 })),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/etfs" className="text-sm text-neutral-500 hover:underline">
            ← ETF 列表
          </Link>
          <h1 className="mt-2 text-xl font-semibold">{etf.name}</h1>
          <p className="mt-1 font-mono text-xs text-neutral-400">
            {etf.code}
            {etf.trackIndex ? ` · ${etf.trackIndex}` : ""}
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link
            href="/backtest/new"
            className="text-teal-700 hover:underline"
          >
            用它回测
          </Link>
          <Link href="/etfs" className="text-neutral-500 hover:underline">
            返回列表
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="最新收盘"
          value={latest ? formatNumber(latest.close, 3) : "-"}
          hint={latest ? formatDate(latest.date) : "无 K 线数据"}
        />
        <StatCard
          label="日涨跌"
          value={latest ? `${latest.changePercent.toFixed(2)}%` : "-"}
          hint={latest ? formatDate(latest.date) : undefined}
        />
        <StatCard
          label="规模"
          value={etf.scale !== null ? formatYi(etf.scale) : "-"}
          hint="亿元"
        />
        <StatCard
          label="最新份额"
          value={latestShare ? formatYi(latestShare.shares) : "-"}
          hint={latestShare ? `亿份 · ${formatDate(latestShare.date)}` : "无份额数据"}
        />
        <StatCard
          label="跟踪指数"
          value={etf.trackingIndex}
          hint={etf.trackIndex ?? undefined}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-900">行情（前复权）</h2>
          <span className="font-mono text-xs text-neutral-400">
            {firstKline && latest
              ? `${formatDate(firstKline.date)} ~ ${formatDate(latest.date)}`
              : "无 K 线数据"}
          </span>
        </div>
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-2">
          <KlineView symbol={etf.code} height={480} />
        </div>
      </section>

      {shares.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-900">份额变化</h2>
            <span className="text-xs text-neutral-400">
              {formatDate(shares[0].date)} ~ {formatDate(shares[shares.length - 1].date)}
            </span>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <TimeSeriesChart series={shareSeries} height={240} digits={1} area />
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-900">持仓</h2>
            <span className="text-xs text-neutral-400">
              {holdingCount > 0 ? `前 ${holdings.length} / 共 ${holdingCount} 只` : "无数据"}
            </span>
          </div>
          {holdings.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500">
              暂无持仓数据。
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                    <th className="px-4 py-2 font-medium">代码</th>
                    <th className="px-4 py-2 font-medium">名称</th>
                    <th className="px-4 py-2 text-right font-medium">权重</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => (
                    <tr
                      key={holding.securityCode}
                      className="border-b border-neutral-100 last:border-b-0"
                    >
                      <td className="px-4 py-2 font-mono text-xs">
                        {holding.securityCode}
                      </td>
                      <td className="px-4 py-2">{holding.name}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {holding.holdScale.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-900">关联 ETF</h2>
            <span className="text-xs text-neutral-400">按相似度排序</span>
          </div>
          {links.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500">
              暂无关联数据。
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                    <th className="px-4 py-2 font-medium">代码</th>
                    <th className="px-4 py-2 font-medium">名称</th>
                    <th className="px-4 py-2 text-right font-medium">相似度</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((link) => (
                    <tr
                      key={link.source}
                      className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50"
                    >
                      <td className="px-4 py-2 font-mono text-xs">
                        <Link href={`/etfs/${link.source}`} className="hover:underline">
                          {link.source}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/etfs/${link.source}`} className="hover:underline">
                          {relatedNameByCode.get(link.source) ?? "-"}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {link.similar !== null ? `${link.similar.toFixed(2)}%` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
