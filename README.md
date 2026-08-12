# Income Statement For XINYU 后台管理系统

面向个人高频卖家的交易与损益管理后台。系统以飞书多维表格为唯一数据源，通过 Cloudflare Pages Functions 将 Web 端的查询和写入操作与飞书数据直接打通。

- 生产地址：[https://20041115.xyz](https://20041115.xyz)
- 当前版本：`v1.0.0`
- 运行平台：Cloudflare Pages + Pages Functions

## 核心功能

- 交易新增、编辑、删除和批量改状态
- 关键词、交易状态和日期范围筛选
- 列排序、分页和指定交易定位
- 经营概览、月度利润趋势、利润区间和状态分布
- CSV 和 Excel 全量导出
- 桌面表格与移动端交易列表
- 浅色/深色主题、键盘焦点和减少动画支持
- 签名 HttpOnly Cookie 会话、接口鉴权和登录限流

## 飞书双向数据同步

飞书多维表格是交易数据的唯一持久化数据源，Web 端不维护第二份业务数据库。

### Web → 飞书

Web 端新增、编辑或删除交易时，Pages Function 会直接调用飞书 Bitable OpenAPI。只有飞书确认操作成功后，Web 才显示成功结果，随后立即重新读取交易和经营汇总。

### 飞书 → Web

交易、概览和分析页在页面可见时每 15 秒自动读取飞书数据。浏览器窗口重新获得焦点或网络恢复时也会立即刷新。后台刷新失败时，页面保留上一次成功数据并提供重试入口。

同一条记录在两端同时编辑时，以最后一次成功保存为准。

## 技术架构

```text
React + TypeScript + TanStack Query
                │
                ▼
        /api/v1/* 同域接口
                │
                ▼
      Cloudflare Pages Functions
                │
                ▼
          飞书 Bitable OpenAPI
```

| 领域       | 技术                       |
| ---------- | -------------------------- |
| 前端       | React 18、TypeScript、Vite |
| 路由       | React Router               |
| 服务端状态 | TanStack React Query       |
| 图表       | Recharts                   |
| 文件导出   | ExcelJS                    |
| 输入验证   | Zod                        |
| BFF        | Cloudflare Pages Functions |
| 数据源     | 飞书多维表格               |
| 测试       | Vitest、Testing Library    |

## 目录结构

```text
src/
├── api/                    # Web API 客户端与自动刷新策略
├── components/             # 通用界面组件
├── domain/                 # 交易映射、查询、分析和导出逻辑
├── features/transactions/  # 交易列表与编辑抽屉
└── pages/                  # 交易、概览、分析、设置与登录页
functions/
├── _shared/                # 飞书、会话、环境和 HTTP 公共能力
└── api/v1/                 # Cloudflare Pages Functions API
docs/superpowers/              # 设计规格与实现计划
```

## 本地开发

### 环境要求

- Node.js 20 或更高版本
- npm
- 已配置权限的飞书企业自建应用

### 安装

```bash
npm install
cp .env.example .dev.vars
```

填写 `.dev.vars` 后，启动完整的 Pages 本地环境：

```bash
npm run dev:pages
```

只启动前端开发服务器：

```bash
npm run dev
```

## 环境变量

| 变量                           | 是否必填 | 用途                                    |
| ------------------------------ | -------- | --------------------------------------- |
| `FEISHU_APP_ID`                | 是       | 飞书应用 ID                             |
| `FEISHU_APP_SECRET`            | 是       | 飞书应用密钥                            |
| `FEISHU_BITABLE_APP_TOKEN`     | 是       | 飞书多维表格 App Token                  |
| `FEISHU_TRANSACTIONS_TABLE_ID` | 是       | 交易表 ID                               |
| `FEISHU_TRANSACTIONS_VIEW_ID`  | 是       | 交易表网格视图 ID，用于保持飞书来源顺序 |
| `FEISHU_USERS_TABLE_ID`        | 是       | 系统用户表 ID                           |
| `SESSION_SECRET`               | 是       | 会话 HMAC 签名密钥，至少 32 个字符      |
| `ALLOWED_ORIGIN`               | 生产必填 | 允许访问 API 的 Web 来源                |

敏感变量必须使用 Cloudflare Pages Secret 或本地 `.dev.vars` 管理，不得写入源码、`wrangler.toml` 或 Git 跟踪文件。

## 飞书表结构

交易表字段：

- 可写：`商品名称`、`交易状态`、`购入日期`、`售出日期`、`购入成本(¥)`、`运费(¥)`、`成交价(¥)`、`备注`
- 公式只读：`总成本(¥)`、`利润(¥)`、`ROI`、`持有天数`

用户表字段：`用户名`、`密码`、`状态`、`角色`。

## 质量验证

运行全部测试、类型检查、ESLint、Prettier 和生产构建：

```bash
npm run verify
```

单独运行：

```bash
npm test
npm run typecheck
npm run lint
npm run format
npm run build
```

## 部署

登录 Wrangler 并在 Cloudflare Pages 的 Production 环境中配置全部必需变量后执行：

```bash
npm run deploy:production
```

该命令会先执行完整质量验证，然后同时上传 `dist/` 静态资源和根目录 `functions/` 中的 Pages Functions。

部署后至少验证：

```bash
curl -i https://your-domain.example/api/v1/auth/session
```

未登录时应返回 `401`、`Content-Type: application/json` 和 `UNAUTHENTICATED`，不应回退到 SPA HTML。

## 上线检查清单

- [ ] `npm run verify` 全部通过
- [ ] Pages Functions 已编译并包含 `/api/v1/*` 路由
- [ ] Production 环境已配置全部必需 Secret
- [ ] `/api/v1/system/health` 在已登录会话下返回 `connected: true`
- [ ] 使用临时记录验证新增、读取、修改和删除
- [ ] 临时测试记录已完整清理
- [ ] 自定义域名 HTTPS 可访问
- [ ] 未跟踪 `.dev.vars`、`.env` 或其他敏感文件
- [ ] 已备份飞书交易表和用户表

## 安全说明

- 不要将飞书 App Secret、Session Secret、Access Token 或真实用户数据提交到 Git。
- 飞书应用仅授予运行本系统所需的最小权限，并限制可访问的 Base 和用户范围。
- 用户表目前按既定产品要求保存明文密码，这是已知高风险项。生产环境必须严格限制该表和飞书应用权限，后续应迁移为密码哈希或外部身份认证。
- 曾经暴露在代码、日志或聊天记录中的任何密钥都应立即撤销并重新生成。

## API 约定

新版接口统一位于 `/api/v1/*`：

- `/api/v1/auth/*`
- `/api/v1/transactions/*`
- `/api/v1/analytics/summary`
- `/api/v1/system/health`

旧版 `/api/auth/*` 和 `/api/feishu/*` 不再是当前 Web 端的数据链路。
