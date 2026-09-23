import { prisma } from "@quant-backtest/db";

import {
  getEtfCodes,
  syncEtfs,
  syncHoldAll,
  syncKline,
  syncLinkFund,
} from "./sync/tasks";
import type { SyncRunResult } from "./sync/runSyncTask";

interface CliOptions {
  command: string;
  code?: string;
  force: boolean;
}

function parseOptions(argv: string[]): CliOptions {
  const command = argv[0] ?? "";
  const codeIndex = argv.indexOf("--code");
  return {
    command,
    code: codeIndex >= 0 ? argv[codeIndex + 1] : undefined,
    force: argv.includes("--force"),
  };
}

function printUsage(): void {
  console.log(
    [
      "用法: tsx src/main.ts <command> [--code 513050.SH] [--force]",
      "",
      "commands:",
      "  etfs",
      "  link-fund",
      "  hold-all",
      "  kline",
      "  all",
    ].join("\n"),
  );
}

function hasFailure(results: Array<SyncRunResult | null>): boolean {
  return results.some((result) => result?.status === "failed");
}

async function resolveCodes(code?: string): Promise<string[]> {
  if (code) return [code];
  return getEtfCodes();
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (!options.command) {
    printUsage();
    return;
  }

  const results: Array<SyncRunResult | null> = [];

  if (options.command === "etfs") {
    results.push(await syncEtfs(options.force));
  } else if (options.command === "link-fund") {
    const codes = await resolveCodes(options.code);
    for (const code of codes) {
      results.push(await syncLinkFund(code, options.force));
    }
  } else if (options.command === "hold-all") {
    const codes = await resolveCodes(options.code);
    for (const code of codes) {
      results.push(await syncHoldAll(code, options.force));
    }
  } else if (options.command === "kline") {
    const codes = await resolveCodes(options.code);
    for (const code of codes) {
      const result = await syncKline(code, options.force);
      results.push(
        result.dayKv2,
        result.subscribeShare,
        result.calculation,
      );
    }
  } else if (options.command === "all") {
    results.push(await syncEtfs(options.force));
    const codes = await resolveCodes(options.code);
    for (const code of codes) {
      results.push(
        await syncLinkFund(code, options.force),
        await syncHoldAll(code, options.force),
      );
      const kline = await syncKline(code, options.force);
      results.push(kline.dayKv2, kline.subscribeShare, kline.calculation);
    }
  } else {
    printUsage();
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({ results }, null, 2));
  if (hasFailure(results)) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
