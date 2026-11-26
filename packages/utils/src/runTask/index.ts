import { prisma } from "@rich/db";
import { isExpiredSuccess } from "../tradingCalendar/tradingCalendar";

export interface TaskOptions<T = any> {
  name: string;
  execute: () => Promise<T>;
  persist: (data: T) => Promise<void>;
  validate: (data: T) => boolean;
}

function logTask(name: string, message: string): void {
  console.log(`[${name}] ${message}`);
}

async function record(
  name: string,
  status: "success" | "failed",
  error: string | null,
): Promise<void> {
  logTask(name, status === "failed" ? "失败" + error : "成功");

  await prisma.task.upsert({
    where: { name },
    create: { name, status, error },
    update: { status, error },
  });
}

/**
 * 每个任务每个交易日只成功执行一次：成功的记录看 updatedAt 有没有跨过收盘
 * （交易日推进），没过期就直接跳过。非交易日不直接跳过，仍按最近一个已收盘
 * 交易日判断，因此空库或上一交易日未同步时会在周末/节假日补跑。
 * 失败（含接口成功但没数据）会记下原因并在下次运行时重试。
 */
export async function runTask<T = any>(options: TaskOptions<T>) {
  const name = options.name;

  const done = await prisma.task.findUnique({
    where: { name },
  });
  if (done?.status === "success" && !isExpiredSuccess(done.updatedAt)) {
    logTask(name, "跳过：最新交易日已同步");
    return;
  }

  logTask(name, "开始");

  try {
    const outcome = await options.execute();

    await options.persist(outcome);

    await record(name, "success", null);
  } catch (error: any) {
    await record(name, "failed", error?.message);
  }
}

export const runTasks = async (options: TaskOptions<any>[]) => {
  for await (const option of options) {
    await runTask(option);
    await new Promise((resolve) =>
      setTimeout(() => {
        resolve(true);
      }, 500),
    );
  }
};
