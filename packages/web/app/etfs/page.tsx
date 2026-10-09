import Link from "next/link";

import { prisma } from "@quant-backtest/db";

import { formatYi } from "@/lib/format";

export const dynamic = "force-dynamic";

type SortKey = "scale" | "code" | "name";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "scale", label: "规模" },
  { key: "code", label: "代码" },
  { key: "name", label: "名称" },
];

function resolveSort(value: string | undefined): SortKey {
  return SORT_OPTIONS.some((option) => option.key === value)
    ? (value as SortKey)
    : "scale";
}

function resolveOrderBy(key: SortKey) {
  if (key === "code") return { code: "asc" as const };
  if (key === "name") return { name: "asc" as const };
  return { scale: "desc" as const };
}

function sortHref(key: SortKey, q: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("sort", key);
  return `/etfs?${params.toString()}`;
}

export default async function EtfListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q: rawQuery, sort: rawSort } = await searchParams;
  const query = (rawQuery ?? "").trim();
  const sort = resolveSort(rawSort);

  const where = query
    ? {
        OR: [
          { code: { contains: query } },
          { name: { contains: query } },
          { trackingIndex: { contains: query } },
          { trackIndex: { contains: query } },
        ],
      }
    : {};

  const etfs = await prisma.etf.findMany({
    where,
    orderBy: resolveOrderBy(sort),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">ETF 列表</h1>
          <p className="mt-1 text-sm text-neutral-500">
            当前共 {etfs.length} 只标的（已按规模与跟踪指数做过清洗）。
          </p>
        </div>
        <form method="get" className="flex items-center gap-2">
          {sort !== "scale" ? (
            <input type="hidden" name="sort" value={sort} />
          ) : null}
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="代码 / 名称 / 跟踪指数"
            className="w-56 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-teal-600"
          />
          <button
            type="submit"
            className="rounded-md bg-teal-700 px-3 py-1.5 text-sm text-white hover:bg-teal-800"
          >
            搜索
          </button>
          {query ? (
            <Link
              href={`/etfs?sort=${sort}`}
              className="text-sm text-neutral-500 hover:underline"
            >
              清除
            </Link>
          ) : null}
        </form>
      </div>

      {etfs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500">
          没有匹配的标的。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                <th className="px-4 py-2 font-medium">
                  <Link
                    href={sortHref("code", query)}
                    className={sort === "code" ? "text-teal-700" : "hover:underline"}
                  >
                    代码
                  </Link>
                </th>
                <th className="px-4 py-2 font-medium">
                  <Link
                    href={sortHref("name", query)}
                    className={sort === "name" ? "text-teal-700" : "hover:underline"}
                  >
                    名称
                  </Link>
                </th>
                <th className="px-4 py-2 font-medium">跟踪指数</th>
                <th className="px-4 py-2 font-medium">指数代码</th>
                <th className="px-4 py-2 text-right font-medium">
                  <Link
                    href={sortHref("scale", query)}
                    className={sort === "scale" ? "text-teal-700" : "hover:underline"}
                  >
                    规模（亿元）
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {etfs.map((etf) => (
                <tr
                  key={etf.code}
                  className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50"
                >
                  <td className="px-4 py-2 font-mono text-xs">
                    <Link href={`/etfs/${etf.code}`} className="hover:underline">
                      {etf.code}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/etfs/${etf.code}`} className="hover:underline">
                      {etf.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-600">{etf.trackingIndex}</td>
                  <td className="px-4 py-2 font-mono text-xs text-neutral-400">
                    {etf.trackIndex ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {etf.scale !== null ? formatYi(etf.scale) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
