k线图表
https://preview.klinecharts.com/

数据
https://github.com/chengzuopeng/stock-sdk

https://fuyao.aicubes.cn/

https://typedtrader.com/
https://github.com/cinar/indicatorts
https://nexustrade.io/
https://github.com/theBigGavin/marketingdashboard/tree/main

市场日历
https://github.com/jaeleeps/market-calendar/tree/main

## 数据同步

```bash
pnpm --filter @quant-backtest/db db:generate
pnpm --filter @quant-backtest/db db:push

# 全量：ETF 列表 + 跟踪指数估值 + 每只 ETF 的关联、持仓、K 线（已成功且没过期的任务自动跳过）
pnpm --filter @rich/crawler sync

# 本地调试：只跑前 5 只 ETF
pnpm --filter @rich/crawler sync:dev
```

每个任务开始和结束各打一行日志：`[taskKey] 开始` / `完成` / `跳过：今日已同步` /
`失败（类型）：原因`；有任何任务失败，进程退出码为 1。

任务状态记录在 `syncTask`，每个任务一行，加上 Prisma 的 `updatedAt` 一共四个字段：

| 字段        | 含义                                     |
| ----------- | ---------------------------------------- |
| `taskKey`   | 任务标识，如 `day_kv2:513050.SH`          |
| `status`    | `success` 或 `failed`                     |
| `error`     | 失败原因（`类型: 说明`），成功时为 `null`  |
| `updatedAt` | 上次运行时间，`success` 靠它判断是否过期   |

交易日来自 [market-calendar](https://github.com/jaeleeps/market-calendar) 的上交所
日历 SSE（沪深节假日一致），见 `packages/crawler/src/calendar/tradingCalendar.ts`：

- 非交易日不再直接跳过：仍按最近一个已收盘的交易日判断，空库或该交易日还没
  成功同步时会补跑，已完成后才跳过；
- `success` 只在它所属的交易日仍是当前交易日时才算数。当前交易日是最近一个
  **已收盘**的交易日，所以盘中看到的仍是上一个交易日的成功记录，收盘之后
  `updatedAt` 就过期了（`isExpiredSuccess`），任务重跑；
- `failed`（含接口成功但没数据）会记下原因并在下次运行时重试；要强制重跑就删掉
  `syncTask` 里对应的那行。

定时任务建议安排在收盘之后（15:00 以后），跑得太早只会拿到尚未更新的数据。

K 线先同步 `dayKV2`，再保存 `subscribeShare` 接口的 `datas` 数组。当天（当前交易日）
的日 K 已经有，就不再从 `subscribeShare` 聚合；只有 `subscribeShare` 的最后日期
晚于 `dayKV2` 最大日期、确实缺日期时，才会聚合补出缺失的日 K。

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
