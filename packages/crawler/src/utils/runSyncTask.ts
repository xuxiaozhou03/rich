import { prisma } from "@quant-backtest/db";

import { isExpiredSuccess } from "../calendar/tradingCalendar";
import { errorMessage, type TaskOutcome } from "./fetchResult";

export interface SyncRunResult {
  taskKey: string;
  status: "success" | "failed" | "skipped";
  resultCode: string;
  message?: string;
}

interface RunSyncTaskOptions<T> {
  /** 任务标识，形如 day_kv2:513050.SH */
  taskKey: string;
  execute: () => Promise<TaskOutcome<T>>;
  persist: (data: T, raw: unknown) => Promise<void>;
}

function logTask(taskKey: string, message: string): void {
  console.log(`[${taskKey}] ${message}`);
}

async function record(
  taskKey: string,
  status: "success" | "failed",
  error: string | null,
): Promise<void> {
  await prisma.syncTask.upsert({
    where: { taskKey },
    create: { taskKey, status, error },
    update: { status, error },
  });
}

/** 任务失败：写库、打日志，并让进程退出码为 1，定时任务据此报警。 */
async function failTask(
  taskKey: string,
  resultCode: string,
  message: string,
): Promise<SyncRunResult> {
  await record(taskKey, "failed", `${resultCode}: ${message}`);
  logTask(taskKey, `失败（${resultCode}）：${message}`);
  process.exitCode = 1;
  return { taskKey, status: "failed", resultCode, message };
}

/**
 * 每个任务每个交易日只成功执行一次：成功的记录看 updatedAt 有没有跨过收盘
 * （交易日推进），没过期就直接跳过。非交易日不直接跳过，仍按最近一个已收盘
 * 交易日判断，因此空库或上一交易日未同步时会在周末/节假日补跑。
 * 失败（含接口成功但没数据）会记下原因并在下次运行时重试。
 */
export async function runSyncTask<T>(
  options: RunSyncTaskOptions<T>,
): Promise<SyncRunResult> {
  const taskKey = options.taskKey;

  const done = await prisma.syncTask.findUnique({
    where: { taskKey },
    select: { status: true, updatedAt: true },
  });
  if (done?.status === "success" && !isExpiredSuccess(done.updatedAt)) {
    logTask(taskKey, "跳过：最新交易日已同步");
    return { taskKey, status: "skipped", resultCode: "synced" };
  }

  logTask(taskKey, "开始");

  try {
    const outcome = await options.execute();

    if (outcome.kind === "error") {
      return failTask(
        taskKey,
        outcome.error.errorType,
        outcome.error.message,
      );
    }

    if (outcome.kind === "empty") {
      return failTask(taskKey, "empty", outcome.reason);
    }

    if (outcome.kind === "data") {
      await options.persist(outcome.data, outcome.raw);
    }

    const resultCode = outcome.kind === "skipped" ? outcome.reason : "success";
    await record(taskKey, "success", null);
    logTask(
      taskKey,
      resultCode === "success" ? "完成" : `完成（${resultCode}）`,
    );
    return { taskKey, status: "success", resultCode };
  } catch (error) {
    return failTask(taskKey, "persist", errorMessage(error));
  }
}
