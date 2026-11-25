import { prisma } from "@rich/db";
import { etfsTask } from "./etfs";
import { runTask, RunTaskOptions, runTasks } from "./utils/runTask";
import { getHoldAllTask } from "./holdAll";
import { getLinkFundTask } from "./links";
import { getKlineTask } from "./klines";
import { getSwTask } from "./sw";
import { getValuationTasks } from "./valuation";

/** --dev 只跑前几只 ETF，方便本地调试时不用等全量。 */
const DEV_CODE_LIMIT = 2;

/** 全量：ETF 列表 + 跟踪指数估值 + 每只 ETF 的关联、持仓与 K 线；--dev 时只跑前 5 只。 */
export async function run(dev: boolean): Promise<void> {
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
    [] as RunTaskOptions[],
  );
  await runTasks(etfTasks);

  const indexCodes = etfs.map((etf) => etf.indexCode);
  const indexTasks = indexCodes.reduce(
    (prev, indexCode) => [
      ...prev,
      getSwTask(indexCode),
      ...getValuationTasks(indexCode),
    ],
    [] as RunTaskOptions[],
  );
  await runTasks(indexTasks);

  //   const trackIndexes = await getTrackIndexes();
  //   for (const indexCode of dev
  //     ? trackIndexes.slice(0, DEV_CODE_LIMIT)
  //     : trackIndexes) {
  //     await syncPepb(indexCode);
  //     await syncSwMap(indexCode);
  //   }

  //   for (const code of dev ? codes.slice(0, DEV_CODE_LIMIT) : codes) {
  //     await syncLinkFund(code, codes);
  //     await syncHoldAll(code);
  //     await syncDayKv2(code);
  //   }
}
