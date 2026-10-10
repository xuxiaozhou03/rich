import assert from "node:assert/strict";
import test from "node:test";

import { parseSwMap } from "./parsers";

test("swMap parses all three industry levels", () => {
  const industries = parseSwMap({
    sw1Count: 1,
    sw2Count: 1,
    sw3Count: 1,
    sw1: [
      {
        code: "801080.ZSI",
        name: "电子",
        weight: 18.4376,
      },
    ],
    sw2: [
      {
        code: "801081.ZSI",
        name: "半导体",
        weight: 4.3643,
      },
    ],
    sw3: [
      {
        code: "852226.ZSI",
        name: "IT服务Ⅲ",
        weight: 6.4594,
      },
    ],
  });

  assert.ok(industries);
  assert.deepEqual(industries, [
    {
      level: 1,
      industryCode: "801080.ZSI",
      name: "电子",
      weight: 18.4376,
    },
    {
      level: 2,
      industryCode: "801081.ZSI",
      name: "半导体",
      weight: 4.3643,
    },
    {
      level: 3,
      industryCode: "852226.ZSI",
      name: "IT服务Ⅲ",
      weight: 6.4594,
    },
  ]);
});

test("swMap drops malformed rows and rejects missing levels", () => {
  const industries = parseSwMap({
    sw1: [
      {
        code: "801080.ZSI",
        name: "电子",
        weight: 18.4376,
      },
      { code: "bad", name: "坏数据" },
    ],
    sw2: [],
    sw3: [],
  });

  assert.ok(industries);
  assert.equal(industries.length, 1);
  assert.equal(parseSwMap({ sw1: [], sw2: [] }), null);
});
