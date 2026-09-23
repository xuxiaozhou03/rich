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

## 复权与份额

`dayKV2` 一次返回全量历史，其中 `factors` 与 `floatShares` 会分别落到
`etfAdjustFactor` 和 `etfFloatShare`。两者都按标的整体替换，接口没返回对应
数组时保留库中已有数据。

`kline` 存的是**未复权**价。`etfAdjustFactor` 是稀疏阶梯，只在上市首日与
除权除息日各一行，`factor` 自该日起生效（早于首条记录按 1 处理），
后复权价 = 原始价 × 当日生效的 factor：

```sql
select k.date,
       k.close as rawClose,
       k.close * coalesce((
         select f.factor from etfAdjustFactor f
         where f.code = k.code and f.date <= k.date
         order by f.date desc limit 1
       ), 1) as hfqClose
from kline k
where k.code = '510300.SH';
```

不复权会漏掉分红收益：`510300.SH` 未复权总收益 77.15%，后复权 124.47%，
累计因子 1.267115 对应 26.71% 的分红贡献。

`etfFloatShare.shares` 是每日份额，`shares * close` 即当日规模，份额环比变化
即申赎资金流，可用来还原历史规模，避免用 `etf.scale` 这个当前快照做选样。
