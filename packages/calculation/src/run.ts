import { Etf, prisma } from "@rich/db";
import { calculateEtfDailyFeatures } from "./features/etfDailyFeatures";
import fs from "fs";

const runEtfFeatures = async (etf: Etf) => {
  const klines = await prisma.kline.findMany({
    where: { code: etf.code },
    orderBy: {
      date: "asc",
    },
  });
  const valuations = await prisma.valuation.findMany({
    where: { indexCode: etf.indexCode },
    orderBy: { date: "asc" },
  });

  const features = calculateEtfDailyFeatures(etf, klines, valuations, 20261125);
  console.log(features);
  fs.writeFileSync(`${etf.code}.json`, JSON.stringify(features));
};

export const run = async (dev: boolean) => {
  const etfs = await prisma.etf.findMany({
    take: dev ? 2 : undefined,
    orderBy: {
      scale: "desc",
    },
  });
  for (const etf of etfs) {
    await runEtfFeatures(etf);
  }
};
