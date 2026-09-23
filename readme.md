k线图表
https://github.com/chengzuopeng/kline-charts-react

数据
https://github.com/chengzuopeng/stock-sdk

https://fuyao.aicubes.cn/

https://typedtrader.com/
https://github.com/cinar/indicatorts
https://nexustrade.io/
https://github.com/theBigGavin/marketingdashboard/tree/main

## 数据同步

```bash
pnpm --filter @quant-backtest/db db:generate
pnpm --filter @quant-backtest/db db:push

pnpm --filter @rich/crawler sync:etfs
pnpm --filter @rich/crawler sync:link-fund -- --code 513050.SH
pnpm --filter @rich/crawler sync:hold-all -- --code 513050.SH
pnpm --filter @rich/crawler sync:kline -- --code 159502.SZ
pnpm --filter @rich/crawler sync:all
```

任务状态记录在 `syncTask`。未过期时重复执行会直接跳过；接口失败和成功但无数据会分别记录。

K 线先同步 `dayKV2`，再保存完整的 `subscribeShare` 原始响应。只有
`subscribeShare` 的最后日期晚于 `dayKV2` 最大日期时，才会聚合缺失日期的日 K。
