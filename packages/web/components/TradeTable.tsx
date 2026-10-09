import { formatDate, formatMoney, formatNumber } from "@/lib/format";

export interface TradeRow {
  id: number;
  date: number;
  code: string;
  side: string;
  price: number;
  indicatorPrice: number;
  shares: number;
  amount: number;
  fee: number;
  slippage: number;
  reason: string;
}

export function TradeTable({ trades }: { trades: TradeRow[] }) {
  if (trades.length === 0) {
    return <p className="text-sm text-neutral-500">本次回测没有产生交易。</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
            <th className="py-2 pr-4 font-medium">日期</th>
            <th className="py-2 pr-4 font-medium">代码</th>
            <th className="py-2 pr-4 font-medium">方向</th>
            <th className="py-2 pr-4 text-right font-medium">成交价</th>
            <th className="py-2 pr-4 text-right font-medium">信号价</th>
            <th className="py-2 pr-4 text-right font-medium">份额</th>
            <th className="py-2 pr-4 text-right font-medium">金额</th>
            <th className="py-2 pr-4 text-right font-medium">费用</th>
            <th className="py-2 pr-4 font-medium">原因</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id} className="border-b border-neutral-100 text-neutral-700">
              <td className="py-2 pr-4 tabular-nums">{formatDate(trade.date)}</td>
              <td className="py-2 pr-4 font-mono text-xs">{trade.code}</td>
              <td className="py-2 pr-4">
                <span className={trade.side === "buy" ? "text-rose-600" : "text-emerald-600"}>
                  {trade.side === "buy" ? "买入" : "卖出"}
                </span>
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(trade.price, 4)}</td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {formatNumber(trade.indicatorPrice, 4)}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">{formatMoney(trade.shares)}</td>
              <td className="py-2 pr-4 text-right tabular-nums">{formatMoney(trade.amount)}</td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {formatNumber(trade.fee + trade.slippage, 2)}
              </td>
              <td className="py-2 pr-4 text-neutral-500">{trade.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
