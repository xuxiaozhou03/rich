import { prisma } from "@/shared";
import { runCrawler } from "./data-management";

function printUsage(): void {
  console.log(
    ["用法: tsx src/main.ts [--dev]", "", "  --dev  只跑前 5 只 ETF"].join(
      "\n",
    ),
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const unknownArgs = argv.filter((arg) => arg !== "--dev");
  if (unknownArgs.length > 0) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  await runCrawler(argv.includes("--dev"));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
