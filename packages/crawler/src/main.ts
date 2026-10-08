import { prisma } from "@quant-backtest/db";

import { getEtfCodes, syncEtfs } from "./etfs/sync";
import { syncHoldAll } from "./holdAll/sync";
import { syncDayKv2 } from "./klines/sync";
import { syncLinkFund } from "./linkFund/sync";
import { syncKlineCalculation, syncSubscribeShare } from "./subscribeShare/sync";

/** --dev 只跑前几只 ETF，方便本地调试时不用等全量。 */
const DEV_CODE_LIMIT = 5;

function printUsage(): void {
  console.log(
    ["用法: tsx src/main.ts [--dev]", "", "  --dev  只跑前 5 只 ETF"].join("\n"),
  );
}

/** 全量：ETF 列表 + 每只 ETF 的关联、持仓与 K 线；--dev 时只跑前 5 只。 */
async function syncAll(dev: boolean): Promise<void> {
  await syncEtfs();

  const codes = await getEtfCodes();
  for (const code of dev ? codes.slice(0, DEV_CODE_LIMIT) : codes) {
    await syncLinkFund(code);
    await syncHoldAll(code);
    await syncDayKv2(code);
    await syncSubscribeShare(code);
    await syncKlineCalculation(code);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const unknownArgs = argv.filter((arg) => arg !== "--dev");
  if (unknownArgs.length > 0) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  await syncAll(argv.includes("--dev"));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
