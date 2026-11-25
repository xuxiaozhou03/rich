import { Links, prisma } from "@rich/db";
import { fetchCheeseApi, generateV4Timestamp } from "../utils/fetchCheeseApi";
import { RunTaskOptions } from "../utils/runTask";

export const getLinkFundTask = (
  code: string,
  codes: string[],
): RunTaskOptions<Links[]> => {
  return {
    name: `link_fund:${code}`,
    execute: async () => {
      const timestamp = Date.now();
      const t = generateV4Timestamp(String(timestamp));

      const encodedCode = encodeURIComponent(code.replace(".", ""));
      const result = await fetchCheeseApi<{
        etfs: Array<{
          similar: number;
          code: string;
        }>;
      }>({
        url: `https://stock.cheesefortune.com/api/v4/etf/linkFund/${code.replace(".", "")}?t=${t}`,
        Referer: `https://stock.cheesefortune.com/security/etf/${encodedCode}?blank=true`,
        timestamp,
      });

      return result.etfs
        .filter((item) => !codes.includes(item.code))
        .map((item) => {
          const codeIsTarget = parseFloat(code) > parseFloat(item.code);
          return {
            target: codeIsTarget ? code : item.code,
            source: !codeIsTarget ? code : item.code,
            similar: item.similar,
          };
        });
    },
    persist: async (records) => {
      await prisma.$transaction(async (tx) => {
        for (const record of records) {
          await tx.link.upsert({
            where: {
              target_source: {
                target: record.target,
                source: record.source,
              },
            },
            create: record,
            update: record,
          });
        }
      });
    },
  };
};
