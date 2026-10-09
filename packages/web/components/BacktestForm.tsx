"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { submitBacktest } from "@/actions/backtest";

export interface StrategyOption {
  id: string;
  name: string;
  description: string;
  defaultParams: Record<string, unknown>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-700 px-4 py-2 text-sm text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "回测运行中…" : "提交回测"}
    </button>
  );
}

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600";
const labelClass = "mb-1 block text-xs text-neutral-500";

export function BacktestForm({
  strategies,
  defaultStrategyId,
  defaultStartDate,
  defaultEndDate,
}: {
  strategies: StrategyOption[];
  defaultStrategyId: string;
  defaultStartDate: string;
  defaultEndDate: string;
}) {
  const [strategyId, setStrategyId] = useState(defaultStrategyId);
  const [paramsText, setParamsText] = useState(
    JSON.stringify(strategies.find((s) => s.id === defaultStrategyId)?.defaultParams ?? {}, null, 2),
  );
  const [universeMode, setUniverseMode] = useState("all");

  function onStrategyChange(id: string) {
    setStrategyId(id);
    const next = strategies.find((s) => s.id === id);
    setParamsText(JSON.stringify(next?.defaultParams ?? {}, null, 2));
  }

  return (
    <form action={submitBacktest} className="max-w-3xl space-y-6">
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-900">基本设置</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="strategyId">
              策略
            </label>
            <select
              id="strategyId"
              name="strategyId"
              className={inputClass}
              value={strategyId}
              onChange={(event) => onStrategyChange(event.target.value)}
            >
              {strategies.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="initCash">
              初始资金
            </label>
            <input
              id="initCash"
              name="initCash"
              type="number"
              step="10000"
              defaultValue={1_000_000}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="startDate">
              开始日期
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={defaultStartDate}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="endDate">
              结束日期
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={defaultEndDate}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-900">标的池</h2>
        <div>
          <label className={labelClass} htmlFor="universeMode">
            模式
          </label>
          <select
            id="universeMode"
            name="universeMode"
            className={inputClass}
            value={universeMode}
            onChange={(event) => setUniverseMode(event.target.value)}
          >
            <option value="all">全市场</option>
            <option value="index">按跟踪指数</option>
            <option value="scale">按规模下限</option>
            <option value="fixed">指定代码</option>
          </select>
        </div>
        {universeMode === "index" ? (
          <div>
            <label className={labelClass} htmlFor="universeIndex">
              跟踪指数名称
            </label>
            <input id="universeIndex" name="universeIndex" className={inputClass} />
          </div>
        ) : null}
        {universeMode === "scale" ? (
          <div>
            <label className={labelClass} htmlFor="minScale">
              规模下限（亿元）
            </label>
            <input
              id="minScale"
              name="minScale"
              type="number"
              step="1"
              defaultValue={10}
              className={inputClass}
            />
          </div>
        ) : null}
        {universeMode === "fixed" ? (
          <div>
            <label className={labelClass} htmlFor="universeCodes">
              代码（逗号或空格分隔）
            </label>
            <input
              id="universeCodes"
              name="universeCodes"
              placeholder="510300.SH, 513050.SH"
              className={inputClass}
            />
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-900">成本模型</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="commissionRate">
              佣金费率
            </label>
            <input
              id="commissionRate"
              name="commissionRate"
              type="number"
              step="0.0001"
              defaultValue={0.0003}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="minCommission">
              最低佣金（元）
            </label>
            <input
              id="minCommission"
              name="minCommission"
              type="number"
              step="1"
              defaultValue={5}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="slippageBp">
              滑点（bp）
            </label>
            <input
              id="slippageBp"
              name="slippageBp"
              type="number"
              step="0.5"
              defaultValue={1}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-900">策略参数（JSON）</h2>
        <textarea
          name="params"
          value={paramsText}
          onChange={(event) => setParamsText(event.target.value)}
          rows={6}
          spellCheck={false}
          className={`${inputClass} font-mono`}
        />
      </section>

      <SubmitButton />
    </form>
  );
}
