# **ETF 量化分析与回测系统 — 总体架构**

基于前面确认的简化方案，我建议整个系统采用 **数据管理 + 特征计算 + 研究分析 + 策略 + 回测** 五个核心业务模块。

另外，把技术指标库作为独立的基础计算能力，而不是一个需要每日运行的数据模块。

整体设计目标：

- 日 K 级别，不涉及实盘交易。
- A 股 ETF 为主要研究对象。
- 全部使用前复权 K 线。
- 历史数据全量计算，每日增量更新。
- 支持单 ETF 分析、多 ETF 比较、量化研究和策略回测。
- TypeScript + Prisma + SQLite。
- Web 界面负责数据管理、研究分析和回测结果展示。

## **1. 系统整体架构**

# **ETF Quant System**

A-share ETF · Daily Kline · Research & Backtesting

**01. Data Management — 数据管理**

爬虫 · 数据验证 · 数据存储 · 数据更新

Etf / Kline / Valuation / Holding / Sw / Link

**02. Feature Engine — 特征引擎**

单 ETF 每日特征 · 多 ETF 横截面特征

Periods / Valuation / Liquidity / RPS

**03. Research Engine**

研究分析

排名 · 筛选 · 形态研究 · 因子分析 · 事件研究

**04. Strategy Engine**

策略引擎

策略编写 · 技术指标 · 信号生成

**05. Backtest Engine — 回测引擎**

历史行情模拟 · 资金管理 · 订单成交 · 持仓管理 · 绩效统计

**Technical Indicator Library — 技术指标库**

独立基础能力，按需提供 MA / MACD / RSI / Bollinger / ATR 等计算，供 Research、Strategy 使用。

**Web Application — Web 应用**

数据管理 · ETF 分析 · 研究工作台 · 策略管理 · 回测管理 · 结果可视化

上图是业务模块关系。Web Application 是交互层，Technical Indicator Library 是共享计算能力，它们不需要和五个业务模块处于同一层级。

## **2. 五大业务模块的职责**

### **01. Data Management — 数据管理**

负责所有原始数据的生命周期。

| 子模块     | 职责                             |
| ---------- | -------------------------------- |
| Crawler    | 爬取 ETF、行情、估值等数据       |
| Validator  | 数据完整性、异常值、重复数据验证 |
| Repository | 数据存储与查询                   |
| Scheduler  | 全量更新、每日增量更新           |
| Revision   | 历史行情修正及变更记录           |

现有数据模型：

```
Etf
Kline
Valuation
Holding
Sw
Link
```

数据范围：

- ETF 基础信息。
- ETF 前复权日 K。
- 指数历史估值。
- ETF 最新持仓。
- ETF 最新行业权重。
- ETF 最新关联关系。

注意：Data Management 只负责数据管理，不负责计算量化特征。

### **02. Feature Engine — 特征引擎**

负责把行情及基础数据转换为标准化特征。

分为两个计算模块：

| 模块                     | 输入            | 输出              |
| ------------------------ | --------------- | ----------------- |
| Single ETF Features      | 单 ETF 历史数据 | EtfDailyFeatures  |
| Cross-sectional Features | 多 ETF 每日特征 | EtfsDailyFeatures |

特征结构：

```
EtfDailyFeatures
├── periods
├── valuation
└── liquidity

EtfsDailyFeatures
└── items
    ├── rps20
    ├── rps60
    ├── rps120
    ├── rank20
    ├── rank60
    └── rank120
```

计算模式：

- 首次：全量历史计算。
- 每日：增量计算。
- 修正：关联特征重新计算。

不负责技术指标、未来收益标签、综合评分和交易信号。

### **03. Research Engine — 研究引擎**

这是整个系统的研究分析中心。

它的核心目标不是交易，而是帮助用户发现规律、分析 ETF、验证投资假设。

建议分为五类能力：

| 子模块           | 职责       | 示例                     |
| ---------------- | ---------- | ------------------------ |
| Ranking          | 排名与评分 | RPS 排名、自定义权重评分 |
| Screening        | 条件筛选   | 找出高 RPS、低估值 ETF   |
| Comparison       | 对比分析   | ETF 收益、风险、估值对比 |
| Pattern Research | 形态研究   | 放量后 5 日收益率        |
| Factor Analysis  | 因子有效性 | RPS 与未来收益的关系     |

另外建议增加：

**Event Study — 事件研究**

专门研究特定事件发生后的历史表现。

例如：

- 放量后 1、3、5、20 日收益。
- MACD 金叉后上涨概率。
- RSI 低于 30 后的反弹表现。
- 突破 60 日高点后的收益分布。

这些研究需要调用 Technical Indicator Library，并使用历史 K 线生成事件样本。

Research Engine 还负责研究用的未来收益标签：

```
export interface ResearchLabel {
  code: string;
  date: DateNumber;

  futureReturn5: NullableNumber;
  futureReturn20: NullableNumber;
  futureReturn60: NullableNumber;

  futureMaxReturn20: NullableNumber;
  futureMinReturn20: NullableNumber;
}
```

这些标签只用于历史分析，不进入 Strategy Engine 的当日可用输入。

### **04. Strategy Engine — 策略引擎**

负责定义策略、计算交易信号。

核心能力：

| 子模块              | 职责                     |
| ------------------- | ------------------------ |
| Strategy Definition | 策略定义                 |
| Strategy Runtime    | 策略执行环境             |
| Feature Access      | 读取每日特征             |
| Indicator Access    | 按需计算技术指标         |
| Signal Generation   | 生成买入、卖出、持有信号 |

策略可以同时使用两类数据：

1. Feature Engine 预先计算好的特征。
2. Technical Indicator Library 按需计算的技术指标。

例如：

```
export function strategy(ctx: StrategyContext) {
  const { features, indicators } = ctx;

  const rsi = indicators.rsi(14);
  const macd = indicators.macd();

  if (
    features.periods["3m"].return !== null &&
    features.periods["3m"].return > 0.1 &&
    rsi < 30 &&
    macd.goldenCross
  ) {
    return {
      action: "BUY",
      amount: 10000,
    };
  }

  return {
    action: "HOLD",
  };
}
```

这里的策略只是示意，实际执行时还需要考虑信号时间、可用资金、持仓和订单约束。

### **05. Backtest Engine — 回测引擎**

负责将策略放入历史行情中模拟运行。

建议分为：

| 子模块           | 职责                 |
| ---------------- | -------------------- |
| Backtest Runner  | 回测任务管理         |
| Market Simulator | 历史行情模拟         |
| Execution        | 订单成交模拟         |
| Portfolio        | 资金、持仓、成本管理 |
| Performance      | 回测绩效统计         |
| Report           | 回测报告             |

基本执行流程：

1. 加载回测配置。
2. 加载策略。
3. 加载历史 ETF 行情及可用特征。
4. 按交易日推进。
5. 调用 Strategy Engine。
6. 生成交易信号。
7. 执行订单模拟。
8. 更新资金及持仓。
9. 计算每日账户净值。
10. 生成回测报告。

遵循此前确定的日 K 收盘价模拟成交、仅做多、FIFO 成本核算等规则。

## **3. 模块之间的数据流**

这里要特别区分两条链路：

- 研究链路：分析历史数据，发现和验证规律。
- 回测链路：按照时间顺序运行策略，模拟交易。

\#chatgpt-mermaid-\_r_cj3\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_cj3\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_cj3\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_cj3\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_cj3\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_cj3\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_cj3\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_cj3\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_cj3\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_cj3\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_cj3\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_cj3\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_cj3\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_cj3\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_cj3\_ p{margin:0;}#chatgpt-mermaid-\_r_cj3\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_cj3\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_cj3\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_cj3\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_cj3\_ .label text,#chatgpt-mermaid-\_r_cj3\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_cj3\_ .node rect,#chatgpt-mermaid-\_r_cj3\_ .node circle,#chatgpt-mermaid-\_r_cj3\_ .node ellipse,#chatgpt-mermaid-\_r_cj3\_ .node polygon,#chatgpt-mermaid-\_r_cj3\_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_cj3\_ .rough-node .label text,#chatgpt-mermaid-\_r_cj3\_ .node .label text,#chatgpt-mermaid-\_r_cj3\_ .image-shape .label,#chatgpt-mermaid-\_r_cj3\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_cj3\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_cj3\_ .rough-node .label,#chatgpt-mermaid-\_r_cj3\_ .node .label,#chatgpt-mermaid-\_r_cj3\_ .image-shape .label,#chatgpt-mermaid-\_r_cj3\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_cj3\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_cj3\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_cj3\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_cj3\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_cj3\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_cj3\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_cj3\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_cj3\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_cj3\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_cj3\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_cj3\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_cj3\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_cj3\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_cj3\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_cj3\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_cj3\_ .icon-shape,#chatgpt-mermaid-\_r_cj3\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_cj3\_ .icon-shape p,#chatgpt-mermaid-\_r_cj3\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_cj3\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_cj3\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_cj3\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_cj3\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_cj3\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_cj3\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_cj3\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_cj3\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_cj3\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_cj3\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_cj3\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_cj3\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_cj3\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_cj3\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_cj3\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_cj3\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_cj3\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_cj3\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_cj3\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_cj3\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_cj3\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_cj3\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_cj3\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_cj3\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_cj3\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_cj3\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_cj3\_ .node rect,#chatgpt-mermaid-\_r_cj3\_ .node circle,#chatgpt-mermaid-\_r_cj3\_ .node ellipse,#chatgpt-mermaid-\_r_cj3\_ .node polygon,#chatgpt-mermaid-\_r_cj3\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_cj3\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_cj3\_ .mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_cj3\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_cj3\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_cj3\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}Data ManagementFeature EngineTechnical Indicator LibraryResearch EngineStrategy EngineBacktest EngineSQLiteWeb Application

需要注意：

**Research Engine 和 Strategy Engine 不是上下游的强依赖关系。**

研究结果可以帮助用户设计策略，但策略也可以直接编写，不必先经过研究引擎。

Backtest Engine 则负责协调策略执行和历史市场模拟。

另外，回测引擎应当按回测日期读取特征，不能直接使用最新特征。

## **4. 数据存储架构**

建议继续使用 Prisma + SQLite，不需要因为模块增加就拆分多个数据库。

按数据性质分成四组：

| 数据类别   | 数据模型                                         | 所属模块            |
| ---------- | ------------------------------------------------ | ------------------- |
| 原始数据   | Etf、Kline、Valuation、Holding、Sw、Link         | Data Management     |
| 基础特征   | EtfDailyFeature、EtfsDailyFeature                | Feature Engine      |
| 研究数据   | ResearchTask、ResearchResult、ResearchLabel      | Research Engine     |
| 策略与回测 | Strategy、Backtest、BacktestTrade、BacktestDaily | Strategy / Backtest |

另外还需要任务管理相关的数据模型：

- DataTask
- FeatureCalculationTask
- ResearchTask
- BacktestTask

建议统一任务状态、日志、执行时间及失败信息的管理规范。

### **数据存储关系**

\#chatgpt-mermaid-\_r_cja\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_cja\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_cja\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_cja\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_cja\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_cja\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_cja\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_cja\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_cja\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_cja\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_cja\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_cja\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_cja\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_cja\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_cja\_ p{margin:0;}#chatgpt-mermaid-\_r_cja\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_cja\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_cja\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_cja\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_cja\_ .label text,#chatgpt-mermaid-\_r_cja\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_cja\_ .node rect,#chatgpt-mermaid-\_r_cja\_ .node circle,#chatgpt-mermaid-\_r_cja\_ .node ellipse,#chatgpt-mermaid-\_r_cja\_ .node polygon,#chatgpt-mermaid-\_r_cja\_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_cja\_ .rough-node .label text,#chatgpt-mermaid-\_r_cja\_ .node .label text,#chatgpt-mermaid-\_r_cja\_ .image-shape .label,#chatgpt-mermaid-\_r_cja\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_cja\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_cja\_ .rough-node .label,#chatgpt-mermaid-\_r_cja\_ .node .label,#chatgpt-mermaid-\_r_cja\_ .image-shape .label,#chatgpt-mermaid-\_r_cja\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_cja\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_cja\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_cja\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_cja\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_cja\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_cja\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_cja\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_cja\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_cja\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_cja\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_cja\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_cja\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_cja\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_cja\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_cja\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_cja\_ .icon-shape,#chatgpt-mermaid-\_r_cja\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_cja\_ .icon-shape p,#chatgpt-mermaid-\_r_cja\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_cja\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_cja\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_cja\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_cja\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_cja\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_cja\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_cja\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_cja\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_cja\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_cja\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_cja\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_cja\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_cja\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_cja\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_cja\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_cja\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_cja\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_cja\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_cja\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_cja\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_cja\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_cja\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_cja\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_cja\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_cja\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_cja\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_cja\_ .node rect,#chatgpt-mermaid-\_r_cja\_ .node circle,#chatgpt-mermaid-\_r_cja\_ .node ellipse,#chatgpt-mermaid-\_r_cja\_ .node polygon,#chatgpt-mermaid-\_r_cja\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_cja\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_cja\_ .mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_cja\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_cja\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_cja\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}原始行情数据基础特征研究结果策略回测模拟回测交易记录每日账户记录回测绩效

这里不建议把所有计算结果都存入数据库。

例如：

- 每日基础特征：持久化。
- 技术指标：按需计算，不持久化。
- 研究结果：根据研究任务持久化。
- 策略运行中的临时指标：不持久化。
- 回测结果：持久化。

## **5. Web Application — 前端功能架构**

前端不必严格按照后端模块划分菜单，而是按照用户使用场景组织。

建议有六个主要功能区域：

**Dashboard — 总览**

ETF 市场概况、涨跌分布、RPS 分布、市场状态

**Data — 数据管理**

ETF 列表、K 线数据、估值数据、爬虫任务、数据验证

**ETF Analysis — ETF 分析**

单 ETF 分析、周期表现、风险、估值、流动性、横向比较

**Research — 研究工作台**

排名、筛选、形态研究、事件研究、因子分析

**Strategies — 策略管理**

策略代码、参数配置、策略版本、策略调试

**Backtests — 回测管理**

回测任务、收益曲线、交易记录、持仓变化、绩效分析

## **6. 技术架构建议**

考虑到你的技术栈，建议采用模块化单体（Modular Monolith），暂时不需要微服务。

**Next.js Application**

页面 · API · 交互 · 可视化

**Application Services**

数据服务 · 特征服务 · 研究服务 · 策略服务 · 回测服务

**Domain**

业务规则与计算逻辑

**Infrastructure**

Prisma · SQLite · Crawler

建议项目目录：

```
src/
├── app/                         # Next.js 页面和 API
│
├── modules/
│   ├── data-management/
│   │   ├── crawler/
│   │   ├── validator/
│   │   ├── repository/
│   │   └── scheduler/
│   │
│   ├── feature-engine/
│   │   ├── single/
│   │   ├── cross-section/
│   │   ├── calculation/
│   │   └── types/
│   │
│   ├── research-engine/
│   │   ├── ranking/
│   │   ├── screening/
│   │   ├── comparison/
│   │   ├── pattern/
│   │   ├── event-study/
│   │   └── factor-analysis/
│   │
│   ├── strategy-engine/
│   │   ├── definition/
│   │   ├── runtime/
│   │   ├── context/
│   │   └── signal/
│   │
│   └── backtest-engine/
│       ├── runner/
│       ├── simulator/
│       ├── execution/
│       ├── portfolio/
│       └── performance/
│
├── libraries/
│   └── technical-indicators/
│       ├── indicators/
│       └── index.ts
│
├── infrastructure/
│   ├── prisma/
│   ├── database/
│   └── task/
│
└── shared/
    ├── types/
    ├── utils/
    └── constants/
```

技术上有三个约束：

1. 各业务模块通过公开接口交互，不直接访问其他模块的内部实现。
2. Domain 层尽量保持纯 TypeScript，不依赖 Next.js。
3. 策略代码必须在隔离环境运行，不能直接访问数据库、文件系统或任意外部网络。

## **7. 核心计算时序与防止未来数据泄漏**

这是整个系统最重要的底层规则之一。

假设策略在 11 月 27 日收盘后产生信号：

| 数据                            | 允许读取 |
| ------------------------------- | -------- |
| 11 月 27 日及之前的 Kline       | 是       |
| 11 月 27 日及之前可获得的估值   | 是       |
| 11 月 27 日的每日基础特征       | 是       |
| 11 月 28 日及之后的行情         | 否       |
| 11 月 27 日之后才公布的持仓信息 | 否       |
| FutureReturn20                  | 否       |

回测中还要区分信号生成时间与成交时间。

按照此前确定的日 K 收盘价成交约定，需要特别处理：如果策略使用当天完整收盘 K 线生成信号，就不能再假设自己在同一个收盘价上提前成交。V0.1 应明确这一成交时序，避免产生不现实的收益。

## **8. 建议的开发顺序**

不要五个模块同时开发，建议按依赖关系推进。

| 阶段 | 模块                 | 交付目标                   |
| ---- | -------------------- | -------------------------- |
| 1    | Data Management      | 原始数据完整、可靠         |
| 2    | Feature Engine       | 全量与增量特征计算         |
| 3    | ETF Analysis         | 单 ETF、多 ETF 分析页面    |
| 4    | Research Engine      | 排名、筛选、形态与因子研究 |
| 5    | Technical Indicators | 技术指标库                 |
| 6    | Strategy Engine      | 策略定义与运行             |
| 7    | Backtest Engine      | 完整历史回测               |
| 8    | Backtest Analysis    | 回测报告及可视化           |

Technical Indicators 虽然是独立库，但可以在策略和研究模块开发之前先完成最小可用版本。

## **9. 最终架构决策汇总**

| 模块                 | 最终定位           | 是否每日计算 |
| -------------------- | ------------------ | ------------ |
| Data Management      | 原始数据管理       | 更新数据时   |
| Feature Engine       | 标准基础特征生产   | 是           |
| Research Engine      | 发现规律、验证假设 | 按需         |
| Technical Indicators | 技术指标计算工具   | 按需         |
| Strategy Engine      | 策略编写与信号生成 | 回测运行时   |
| Backtest Engine      | 历史交易模拟       | 回测运行时   |

**我认为这套架构已经可以作为整个项目的 V0.1 总体架构。**

尤其重要的是明确了三个层次：

- Feature Engine：生产数据。
- Research Engine：研究数据。
- Strategy + Backtest：使用数据进行交易模拟。

这样就不会出现每个模块都重新计算收益率、MACD、RPS、最大回撤的情况。

下一步最合理的是先冻结这份《系统总体架构 PRD》，再分别确定 Data Management、Feature Engine、Research Engine、Strategy Engine 和 Backtest Engine 的模块级 PRD。
