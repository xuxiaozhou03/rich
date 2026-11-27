按照目前确定的架构，Hono 不只是一个简单的 API 服务，而是整个量化平台的 **应用服务层**：负责 API、业务协调、任务管理、项目管理和结果查询。

我建议采用 **模块化单体（Modular Monolith）+ 本地 Worker**。V0.1 不拆微服务，也不把量化计算逻辑塞进 Hono。

下面给出一套可以直接交给 Codex 创建项目的完整目录结构。

# **1. 技术结构**

| 层次      | 技术                    |
| --------- | ----------------------- |
| HTTP 服务 | Hono                    |
| 运行环境  | Node.js                 |
| 开发语言  | TypeScript              |
| 数据库    | SQLite                  |
| ORM       | Prisma                  |
| 参数校验  | Zod                     |
| 前端      | HTML + CSS + TypeScript |
| 图表      | ECharts                 |
| 任务执行  | 本地 Worker             |
| 构建      | Vite + tsx（开发阶段）  |

# **2. 完整目录结构**

```

quant-platform/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env
├── .env.example
├── .gitignore
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── projects/                       # 用户编写的 Research / Strategy
│   ├── research/
│   │   └── rps-analysis/
│   │       ├── index.ts
│   │       └── src/
│   │           └── analysis.ts
│   └── strategy/
│       └── ma-cross/
│           ├── index.ts
│           └── src/
│               └── strategy.ts
│
├── src/
│   ├── server.ts                   # Hono 启动入口
│   ├── app.ts                      # Hono App 组装
│   │
│   ├── config/
│   │   ├── env.ts                  # 环境变量
│   │   └── constants.ts            # 全局常量
│   │
│   ├── core/                       # 基础设施与公共能力
│   │   ├── database/
│   │   │   ├── prisma.ts           # Prisma Client 单例
│   │   │   └── transaction.ts
│   │   ├── errors/
│   │   │   ├── app-error.ts
│   │   │   └── error-handler.ts
│   │   ├── logger/
│   │   │   └── logger.ts
│   │   ├── filesystem/
│   │   │   └── paths.ts
│   │   └── utils/
│   │       ├── date.ts
│   │       ├── id.ts
│   │       └── json.ts
│   │
│   ├── modules/                    # 业务模块
│   │   │
│   │   ├── data/                   # Data Engine
│   │   │   ├── routes.ts
│   │   │   ├── controller.ts
│   │   │   ├── service.ts
│   │   │   ├── schemas.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── feature/                # Feature Engine
│   │   │   ├── routes.ts
│   │   │   ├── controller.ts
│   │   │   ├── service.ts
│   │   │   ├── schemas.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── projects/               # Project Engine
│   │   │   ├── routes.ts
│   │   │   ├── controller.ts
│   │   │   ├── service.ts
│   │   │   ├── registry.ts
│   │   │   ├── loader.ts
│   │   │   ├── parser.ts
│   │   │   ├── schemas.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── runs/                   # Run 管理
│   │   │   ├── routes.ts
│   │   │   ├── controller.ts
│   │   │   ├── service.ts
│   │   │   ├── repository.ts
│   │   │   ├── schemas.ts
│   │   │   └── types.ts
│   │   │
│   │   └── system/                 # 系统状态
│   │       ├── routes.ts
│   │       ├── controller.ts
│   │       └── service.ts
│   │
│   ├── engines/                    # 核心计算引擎
│   │   ├── data-engine/
│   │   │   ├── collectors/
│   │   │   ├── validators/
│   │   │   ├── normalizers/
│   │   │   ├── repositories/
│   │   │   ├── tasks/
│   │   │   └── index.ts
│   │   │
│   │   ├── feature-engine/
│   │   │   ├── calculators/
│   │   │   ├── cross-sectional/
│   │   │   ├── repositories/
│   │   │   ├── tasks/
│   │   │   └── index.ts
│   │   │
│   │   ├── quant-sdk/
│   │   │   ├── data/
│   │   │   ├── features/
│   │   │   ├── indicators/
│   │   │   ├── statistics/
│   │   │   ├── labels/
│   │   │   ├── cross-sectional/
│   │   │   ├── backtest/
│   │   │   └── index.ts
│   │   │
│   │   └── backtest-engine/
│   │       ├── account/
│   │       ├── orders/
│   │       ├── executions/
│   │       ├── positions/
│   │       ├── portfolio/
│   │       ├── metrics/
│   │       └── index.ts
│   │
│   ├── runtime/                    # 项目执行基础设施
│   │   ├── worker/
│   │   │   ├── worker.ts
│   │   │   ├── worker-client.ts
│   │   │   └── worker-manager.ts
│   │   ├── executor/
│   │   │   ├── project-executor.ts
│   │   │   └── execution-context.ts
│   │   ├── queue/
│   │   │   ├── queue.ts
│   │   │   └── task.ts
│   │   ├── logs/
│   │   │   └── log-collector.ts
│   │   └── index.ts
│   │
│   ├── shared/                     # 共享类型与协议
│   │   ├── types/
│   │   │   ├── common.ts
│   │   │   ├── market.ts
│   │   │   ├── feature.ts
│   │   │   ├── project.ts
│   │   │   ├── run.ts
│   │   │   └── result.ts
│   │   └── schemas/
│   │
│   └── web/                        # 前端资源
│       ├── index.html
│       ├── assets/
│       │   ├── styles/
│       │   │   ├── global.css
│       │   │   ├── layout.css
│       │   │   └── components.css
│       │   └── images/
│       ├── scripts/
│       │   ├── main.ts
│       │   ├── api/
│       │   │   ├── client.ts
│       │   │   ├── data.ts
│       │   │   ├── projects.ts
│       │   │   └── runs.ts
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   ├── form/
│       │   │   ├── charts/
│       │   │   ├── tables/
│       │   │   └── common/
│       │   ├── pages/
│       │   │   ├── dashboard.ts
│       │   │   ├── data.ts
│       │   │   ├── features.ts
│       │   │   ├── projects.ts
│       │   │   ├── project-detail.ts
│       │   │   ├── run-detail.ts
│       │   │   └── run-history.ts
│       │   └── router.ts
│       └── types/
│
├── data/                           # 本地运行数据
│   ├── database/
│   ├── logs/
│   ├── artifacts/
│   └── cache/
│
├── scripts/                        # 开发及维护脚本
│   ├── dev.ts
│   ├── build.ts
│   └── rebuild-kline.ts
│
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/

```

# **3. 各目录职责**

建议特别注意以下几个边界。

| 目录        | 职责                           | 是否属于 Hono |
| ----------- | ------------------------------ | ------------- |
| `modules/`  | API 与业务协调                 | 是            |
| `engines/`  | 数据、特征、量化和回测核心逻辑 | 否            |
| `runtime/`  | Worker 与项目执行              | 否            |
| `projects/` | 用户编写的研究和策略           | 否            |
| `web/`      | 前端交互和展示                 | 否            |
| `core/`     | 基础设施                       | 公共依赖      |

例如：

用户点击运行 Research 项目：

1. `modules/projects` 解析项目定义。
2. `modules/runs` 创建 Run。
3. `runtime` 将任务交给 Worker。
4. Worker 加载 `projects/research` 中的项目。
5. 项目通过 `quant-sdk` 获取行情和特征。
6. 执行完成后，结果交给 Run Service 持久化。
7. 前端通过 Runs API 获取结果。

Hono 本身不负责执行量化计算。

# **4. Hono API 路由设计**

统一使用 `/api` 前缀。

| 路由                              | 用途             |
| --------------------------------- | ---------------- |
| `GET /api/system/status`          | 系统状态         |
| `GET /api/data/overview`          | 数据概览         |
| `GET /api/data/etfs`              | ETF 列表         |
| `GET /api/data/klines`            | Kline 查询       |
| `GET /api/data/tasks`             | 数据任务列表     |
| `POST /api/data/tasks`            | 创建数据任务     |
| `GET /api/features/status`        | 特征计算状态     |
| `POST /api/features/tasks`        | 创建特征计算任务 |
| `GET /api/projects`               | 项目列表         |
| `GET /api/projects/:id`           | 项目详情         |
| `POST /api/projects/:id/validate` | 项目校验         |
| `POST /api/projects/:id/runs`     | 创建运行         |
| `GET /api/runs`                   | Run 历史         |
| `GET /api/runs/:id`               | Run 详情         |
| `GET /api/runs/:id/logs`          | Run 日志         |
| `GET /api/runs/:id/results`       | Run 结果         |
| `POST /api/runs/:id/cancel`       | 取消任务         |

# **5. 关键设计约束**

### **5.1 不要混淆 modules 和 engines**

例如：

- `modules/data` 负责接收数据更新请求、创建任务、返回状态。
- `engines/data-engine` 负责真正的采集、验证、标准化和写入。

API 层不应该包含具体爬虫实现。

### **5.2 Quant SDK 不依赖 Hono**

Quant SDK 应该是独立的 TypeScript 库。

它可以被：

- Research 项目调用。
- Strategy 项目调用。
- Backtest Engine 调用。
- 单元测试调用。

不应该依赖 HTTP Request、Context 或 Hono 路由。

### **5.3 Worker 不依赖 Web 请求**

Worker 接收的是任务 ID 和任务参数，而不是 Hono 的 Context。

这样即使用户关闭浏览器，任务也可以继续执行。

### **5.4 前端不直接访问 Prisma**

所有数据都通过 Hono API 获取。

### **5.5 Kline 重建是 Data Engine 的任务**

`scripts/rebuild-kline.ts` 只是触发入口，实际重建逻辑仍由 Data Engine 实现。

重建完成后，必须触发 Feature Engine 全量重算。

# **6. V0.1 实际开发建议**

虽然上面列出了完整结构，但不建议 Codex 一次性创建所有空目录和模块。

建议第一阶段先建立这些内容：

```

src/
├── server.ts
├── app.ts
├── config/
├── core/
│   ├── database/
│   ├── errors/
│   └── logger/
├── modules/
│   ├── system/
│   ├── data/
│   ├── feature/
│   ├── projects/
│   └── runs/
├── engines/
│   ├── data-engine/
│   ├── feature-engine/
│   └── quant-sdk/
├── runtime/
└── web/

```

Backtest Engine 可以等 Quant SDK 和 Strategy 接口确定后再实现，不需要在最初阶段提前建立完整交易系统。

**我的建议：** 这套结构可以作为总体目录基线，但需要注意一个地方：`modules/` 是 Hono 应用服务层，`engines/` 是真正的领域计算层。两者分开，未来无论增加 CLI、自动化任务还是其他调用入口，都不需要重写计算逻辑。

下一步可以继续确定 `src/` 内部的模块接口和依赖关系，再让 Codex 按照这个结构搭建基础工程。
