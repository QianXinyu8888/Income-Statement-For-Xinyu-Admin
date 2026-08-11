# 闲鱼损益管理系统

面向个人高频卖家的交易与利润管理后台。前端使用 React、TypeScript 与 Vite，Cloudflare Pages Functions 作为同域 BFF，飞书多维表格是唯一数据源。

## 功能

- 交易搜索、状态/日期/分类筛选、排序与分页
- 新增、编辑、单条删除、批量改状态和批量删除
- 桌面表格与手机等价交易列表
- 经营概览、月度趋势、利润区间与分类贡献
- CSV 与 Excel 按需导出
- 签名 HttpOnly Cookie 会话、接口鉴权与登录限流
- 浅色/深色主题、键盘焦点和减少动画支持

## 本地验证

需要 Node.js 20 或更高版本。

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

仅查看前端：

```bash
npm run dev
```

同时运行 Cloudflare Pages Functions：先在 `.dev.vars` 配置下面的变量，然后运行：

```bash
npm run dev:pages
```

## Cloudflare 环境变量

以下变量全部必填，敏感值必须通过 Cloudflare Secret 配置，不得写入源码或 `wrangler.toml`：

| 变量                           | 用途                                    |
| ------------------------------ | --------------------------------------- |
| `FEISHU_APP_ID`                | 飞书应用 ID                             |
| `FEISHU_APP_SECRET`            | 飞书应用密钥                            |
| `FEISHU_BITABLE_APP_TOKEN`     | 多维表格 App Token                      |
| `FEISHU_TRANSACTIONS_TABLE_ID` | 交易表 ID                               |
| `FEISHU_USERS_TABLE_ID`        | 用户表 ID                               |
| `SESSION_SECRET`               | 至少 32 字符的随机会话签名密钥          |
| `ALLOWED_ORIGIN`               | 生产域名，当前为 `https://20041115.xyz` |

交易表字段以现有飞书结构为准：`商品名称`、`运费(¥)`、`ROI`、`排序`、`成交价(¥)`、`购入日期`、`备注`、`利润(¥)`、`持有天数`、`交易状态`、`总成本(¥)`、`售出日期`、`购入成本(¥)`。其中公式字段由飞书计算，Web 端只读。

用户表规范字段：`用户名`、`密码`、`状态`、`角色`。按产品决定，密码目前仍以明文保存在飞书表中，这是已知高危残余风险；必须严格控制该表及飞书应用权限。

## 上线前检查

1. 在飞书开放平台撤销并重新生成曾经写入旧源码的 App Secret。
2. 导出交易表和用户表备份。
3. 在 Cloudflare Preview 环境配置全部变量并验证登录与 CRUD。
4. 确认用户表、交易表字段名和类型与上述规范一致。
5. 运行完整质量检查后，再将 `20041115.xyz` 指向新部署。

旧版 API `/api/auth/*` 与 `/api/feishu/*` 已移除；新版接口统一位于 `/api/v1/*`。
