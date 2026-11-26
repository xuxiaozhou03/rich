import { prisma } from "@rich/db";
import { etfsTask } from "./etfs";
import { getHoldAllTask } from "./holdAll";
import { getLinkFundTask } from "./links";
import { getKlineTask } from "./klines";
import { getSwTask } from "./sw";
import { getValuationTasks } from "./valuation";
import { runTask, TaskOptions, runTasks } from "@rich/utils";

/** --dev 只跑前几只 ETF，方便本地调试时不用等全量。 */
const DEV_CODE_LIMIT = 2;

/** 全量：ETF 列表 + 跟踪指数估值 + 每只 ETF 的关联、持仓与 K 线；--dev 时只跑前 5 只。 */
export async function runCrawler(dev: boolean): Promise<void> {
  await runTask(etfsTask);

  const etfs = await prisma.etf.findMany({
    take: dev ? DEV_CODE_LIMIT : undefined,
    select: {
      code: true,
      indexCode: true,
    },
    orderBy: { scale: "desc" },
  });

  const etfCodes = etfs.map((etf) => etf.code);
  const etfTasks = etfCodes.reduce(
    (prev, code) => [
      ...prev,
      getHoldAllTask(code),
      getLinkFundTask(code, etfCodes),
      getKlineTask(code),
    ],
    [] as TaskOptions[],
  );
  await runTasks(etfTasks);

  const indexCodes = etfs.map((etf) => etf.indexCode);
  const indexTasks = indexCodes.reduce(
    (prev, indexCode) => [
      ...prev,
      getSwTask(indexCode),
      ...getValuationTasks(indexCode),
    ],
    [] as TaskOptions[],
  );
  await runTasks(indexTasks);
}
