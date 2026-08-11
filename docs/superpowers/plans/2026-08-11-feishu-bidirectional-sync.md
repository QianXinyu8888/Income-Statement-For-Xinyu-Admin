# 飞书双向数据同步实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 使 Web 端写操作直接落到飞书，并让保持打开的 Web 页面自动读取飞书端的变更，同时修复生产 Pages Functions 部署。

**架构：** 飞书 Bitable 继续作为唯一数据源；交易和分析 React Query 每 15 秒在可见页面刷新，窗口聚焦或网络恢复时立即刷新。写入继续同步等待飞书 API，成功后立即作废页面查询；背景刷新失败保留旧数据并显示同步状态。

**技术栈：** React 18、TypeScript、TanStack React Query 5、Vitest、Cloudflare Pages Functions、Wrangler、飞书 Bitable OpenAPI。

---

## 文件结构

- 创建 `src/api/live-query.ts`：定义可复用的飞书实时数据查询选项。
- 创建 `src/api/live-query.test.ts`：验证刷新间隔和页面可见性策略。
- 修改 `src/main.tsx`：恢复窗口聚焦和网络重连刷新。
- 修改 `src/pages/TransactionsPage.tsx`：启用定时刷新，显示最近同步时间，并在背景失败时保留旧数据。
- 修改 `src/pages/TransactionsPage.test.tsx`：验证定时刷新、同步状态和背景错误。
- 修改 `src/pages/OverviewPage.tsx`、`src/pages/AnalyticsPage.tsx`：为汇总查询启用同一定时刷新策略。
- 修改 `src/pages/AnalyticsPage.test.tsx`：验证分析查询使用实时查询选项。
- 修改 `src/api/client.test.ts`：补齐 Web CRUD 请求合同测试。
- 创建 `functions/api/v1/transactions/transactions.test.ts`：验证 Pages Function 到飞书 API 的 CRUD 路由和部分失败语义。
- 修改 `src/styles.css`：增加轻量同步状态样式。
- 修改 `package.json`：增加统一验证和 Pages 部署命令。
- 验证 `wrangler.toml`：确认项目名、静态输出目录和生产域名一致。

### 任务 1：定义自动刷新查询策略

**文件：**

- 创建：`src/api/live-query.ts`
- 创建：`src/api/live-query.test.ts`
- 修改：`src/main.tsx:8-10`

- [ ] **步骤 1：编写失败的实时查询选项测试**

```ts
import { describe, expect, it } from 'vitest';
import { LIVE_QUERY_OPTIONS, LIVE_QUERY_INTERVAL_MS } from './live-query';

describe('live Feishu query options', () => {
  it('refreshes visible live-data queries every 15 seconds', () => {
    expect(LIVE_QUERY_INTERVAL_MS).toBe(15_000);
    expect(LIVE_QUERY_OPTIONS).toEqual({
      refetchInterval: 15_000,
      refetchIntervalInBackground: false,
    });
  });
});
```

- [ ] **步骤 2：运行测试并确认因模块缺失而失败**

运行：`npm test -- src/api/live-query.test.ts`

预期：FAIL，报错无法解析 `./live-query`。

- [ ] **步骤 3：实现最小查询选项**

```ts
export const LIVE_QUERY_INTERVAL_MS = 15_000;

export const LIVE_QUERY_OPTIONS = {
  refetchInterval: LIVE_QUERY_INTERVAL_MS,
  refetchIntervalInBackground: false,
} as const;
```

将 `src/main.tsx` 的默认查询设置改为：

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});
```

- [ ] **步骤 4：运行测试并确认通过**

运行：`npm test -- src/api/live-query.test.ts`

预期：1 个测试通过。

- [ ] **步骤 5：提交查询策略**

```bash
git add src/api/live-query.ts src/api/live-query.test.ts src/main.tsx
git commit -m "feat: 增加飞书数据自动刷新策略"
```

### 任务 2：交易页自动刷新与同步状态

**文件：**

- 修改：`src/pages/TransactionsPage.test.tsx`
- 修改：`src/pages/TransactionsPage.tsx:42-55, 180-200, 311-317`
- 修改：`src/styles.css:177-205, 655-663`

- [ ] **步骤 1：编写失败的定时刷新和背景错误测试**

在 `TransactionsPage.test.tsx` 增加两个单一行为测试：

```tsx
it('automatically reloads transactions while the page remains open', async () => {
  const transactions = vi
    .spyOn(apiClient, 'transactions')
    .mockResolvedValueOnce(pageWith(target))
    .mockResolvedValueOnce(pageWith({ ...target, title: '飞书已修改' }));
  renderPage('/transactions');

  expect(await screen.findByText('目标产品')).toBeInTheDocument();
  await act(async () => vi.advanceTimersByTimeAsync(15_000));

  await waitFor(() => expect(transactions).toHaveBeenCalledTimes(2));
  expect(await screen.findByText('飞书已修改')).toBeInTheDocument();
});

it('keeps the last successful records when a background refresh fails', async () => {
  vi.spyOn(apiClient, 'transactions')
    .mockResolvedValueOnce(pageWith(target))
    .mockRejectedValueOnce(new Error('飞书暂时不可用'));
  renderPage('/transactions');

  expect(await screen.findByText('目标产品')).toBeInTheDocument();
  await act(async () => vi.advanceTimersByTimeAsync(15_000));

  expect(await screen.findByText('同步失败')).toBeInTheDocument();
  expect(screen.getByText('目标产品')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '重试同步' })).toBeInTheDocument();
});
```

`pageWith` 返回包含单条记录的 `TransactionPage`，避免测试重复数据。

- [ ] **步骤 2：运行页面测试并确认失败**

运行：`npm test -- src/pages/TransactionsPage.test.tsx`

预期：FAIL；15 秒后没有发起第二次请求，且不存在同步状态。

- [ ] **步骤 3：为交易和月度汇总查询加入实时选项**

```tsx
const result = useQuery({
  queryKey: ['transactions', query],
  queryFn: () => apiClient.transactions(query),
  placeholderData: (previousData) => previousData,
  ...LIVE_QUERY_OPTIONS,
});

const monthSummary = useQuery({
  queryKey: ['summary', month],
  queryFn: () => apiClient.summary(`${month}-01`, `${month}-${monthEnd}`),
  ...LIVE_QUERY_OPTIONS,
});
```

- [ ] **步骤 4：实现最近同步时间和背景失败显示**

当 `result.dataUpdatedAt > 0` 时显示 `最近同步 HH:mm:ss`。当 `result.isError && result.data` 时显示非遮挡错误条和调用 `result.refetch()` 的“重试同步”按钮。首次错误的整页分支改为：

```tsx
{result.isLoading ? (
  <LoadingState label="正在加载交易" />
) : result.isError && !result.data ? (
  <ErrorState message={result.error.message} onRetry={() => result.refetch()} />
) : records.length === 0 ? (
```

- [ ] **步骤 5：增加最小同步状态样式**

```css
.sync-status {
  color: var(--muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.sync-status--error {
  color: var(--loss);
  display: flex;
  align-items: center;
  gap: 8px;
}
```

- [ ] **步骤 6：运行交易页测试并确认通过**

运行：`npm test -- src/pages/TransactionsPage.test.tsx`

预期：交易页全部测试通过，无未处理 Promise 或 `act` 警告。

- [ ] **步骤 7：提交交易页同步交互**

```bash
git add src/pages/TransactionsPage.tsx src/pages/TransactionsPage.test.tsx src/styles.css
git commit -m "feat: 自动刷新飞书交易数据"
```

### 任务 3：概览和分析页使用同一刷新策略

**文件：**

- 修改：`src/pages/OverviewPage.tsx:18-19`
- 修改：`src/pages/AnalyticsPage.tsx:73-77`
- 修改：`src/pages/AnalyticsPage.test.tsx`

- [ ] **步骤 1：编写失败的分析页自动刷新测试**

```tsx
it('automatically reloads analytics data while visible', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const request = vi.spyOn(apiClient, 'summary').mockResolvedValue(summary);
  renderPage();
  expect(await screen.findByText('月度趋势')).toBeInTheDocument();

  await act(async () => vi.advanceTimersByTimeAsync(15_000));

  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  vi.useRealTimers();
});
```

- [ ] **步骤 2：运行分析页测试并确认失败**

运行：`npm test -- src/pages/AnalyticsPage.test.tsx`

预期：FAIL，15 秒后 `apiClient.summary` 仍只调用一次。

- [ ] **步骤 3：将实时选项应用到概览和分析查询**

```tsx
const summary = useQuery({
  queryKey: ['summary'],
  queryFn: () => apiClient.summary(),
  ...LIVE_QUERY_OPTIONS,
});
```

```tsx
const summary = useQuery({
  queryKey: ['summary', from, to],
  queryFn: () => apiClient.summary(from || undefined, to || undefined),
  ...LIVE_QUERY_OPTIONS,
});
```

- [ ] **步骤 4：运行分析与交易页测试并确认通过**

运行：`npm test -- src/pages/AnalyticsPage.test.tsx src/pages/TransactionsPage.test.tsx`

预期：两个文件全部通过。

- [ ] **步骤 5：提交汇总页自动刷新**

```bash
git add src/pages/OverviewPage.tsx src/pages/AnalyticsPage.tsx src/pages/AnalyticsPage.test.tsx
git commit -m "feat: 自动刷新飞书经营汇总"
```

### 任务 4：补齐 Web 到飞书 CRUD 合同测试

**文件：**

- 修改：`src/api/client.test.ts`
- 创建：`functions/api/v1/transactions/transactions.test.ts`

- [ ] **步骤 1：为 API 客户端写入请求增加合同测试**

使用合法 `TransactionInput` 分别调用 `createTransaction`、`updateTransaction`、`deleteTransaction`、`batchStatus` 和 `batchDelete`，断言：

```ts
expect(fetchMock).toHaveBeenNthCalledWith(
  1,
  '/api/v1/transactions',
  expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }),
);
expect(fetchMock).toHaveBeenNthCalledWith(
  2,
  '/api/v1/transactions/record%2F1',
  expect.objectContaining({ method: 'PUT', body: JSON.stringify(input) }),
);
expect(fetchMock).toHaveBeenNthCalledWith(
  3,
  '/api/v1/transactions/record%2F1',
  expect.objectContaining({ method: 'DELETE' }),
);
```

- [ ] **步骤 2：运行客户端合同测试**

运行：`npm test -- src/api/client.test.ts`

预期：所有客户端路径、方法和请求体断言通过；若发现合同偏差，先确认是否为现有缺陷，再进入红绿修复。

- [ ] **步骤 3：编写 Pages Function CRUD 集成测试支架**

创建已签名会话 Cookie，用 `vi.stubGlobal('fetch', fetchMock)` 依次返回 tenant token 和飞书记录响应，直接调用 `onRequest`:

```ts
const response = await onRequest({
  request,
  env,
  params: { path: [] },
} as unknown as EventContext<Record<string, unknown>, string, unknown>);

expect(response.status).toBe(201);
expect(fetchMock).toHaveBeenLastCalledWith(
  expect.stringContaining('/bitable/v1/apps/app/tables/transactions/records'),
  expect.objectContaining({ method: 'POST' }),
);
```

分别覆盖 POST、PUT、DELETE，并为批量操作断言逐条 `success` 结果。

- [ ] **步骤 4：运行 Pages Function 测试并修正测试发现的合同缺陷**

运行：`npm test -- functions/api/v1/transactions/transactions.test.ts`

预期：读写路由和部分失败语义全部通过。若测试暴露生产缺陷，为该单一缺陷保留失败测试，再对 `functions/api/v1/transactions/[[path]].ts` 作最小修复。

- [ ] **步骤 5：提交 CRUD 合同测试**

```bash
git add src/api/client.test.ts functions/api/v1/transactions/transactions.test.ts functions/api/v1/transactions/\[\[path\]\].ts
git commit -m "test: 覆盖飞书交易 CRUD 链路"
```

### 任务 5：固化质量检查和 Pages 部署入口

**文件：**

- 修改：`package.json:6-16`
- 验证：`wrangler.toml`

- [ ] **步骤 1：在 `package.json` 增加统一验证和生产部署命令**

```json
"verify": "npm test && npm run typecheck && npm run lint && npm run format && npm run build",
"deploy:production": "npm run verify && wrangler pages deploy dist --project-name income-statement-dashboard --branch main"
```

部署命令必须从项目根目录运行，使 Wrangler 发现根目录的 `functions/`；不使用 Cloudflare Dashboard 的纯静态 Direct Upload。

- [ ] **步骤 2：验证 Wrangler 本地构建能编译 Pages Functions**

运行：

```bash
npm run build
npx wrangler pages functions build --outdir .wrangler/functions-build
```

预期：生成 Pages Functions Worker，路由包含 `/api/v1/auth/*`、`/api/v1/transactions/*`、`/api/v1/analytics/summary` 和 `/api/v1/system/health`。检查后删除未跟踪的 `.wrangler/functions-build` 产物。

- [ ] **步骤 3：运行统一验证命令**

运行：`npm run verify`

预期：测试零失败，TypeScript、ESLint、Prettier 和 Vite 构建全部退出 0。

- [ ] **步骤 4：提交部署入口**

```bash
git add package.json package-lock.json
git commit -m "build: 固化 Pages Functions 生产部署"
```

### 任务 6：生产部署与真实双向验收

**文件：**

- 验证：`dist/`
- 验证：`functions/`
- 验证：Cloudflare Pages 项目 `income-statement-dashboard`
- 验证：飞书交易表

- [ ] **步骤 1：部署已验证的工作树**

运行：`npm run deploy:production`

预期：Wrangler 报告新的 Production deployment URL，且未跳过 Functions bundle。

- [ ] **步骤 2：验证生产 API 路由不再回退到 HTML**

运行：

```bash
curl -i https://20041115.xyz/api/v1/auth/session
curl -i https://20041115.xyz/api/v1/transactions
```

预期：两者均返回 `401`、`Content-Type: application/json` 和 `UNAUTHENTICATED`，而不是 `200 text/html`。

- [ ] **步骤 3：使用真实飞书表执行可清理 CRUD 烟雾测试**

使用 `.dev.vars` 的凭据在内存中获取 token，创建商品名称为 `Codex 双向同步验证 <ISO 时间>` 的记录。整个脚本使用 `try/finally`：

1. POST 新增后保存 `record_id`。
2. GET 该 `record_id` 并断言新增字段。
3. PUT 将商品名称加上 `-已修改`，再 GET 断言新值。
4. DELETE 该记录，再 GET 确认已不存在。
5. `finally` 中若记录仍存在则再执行一次精确 DELETE。

命令输出只显示步骤状态、测试记录 ID 和清理结果，不输出 app secret、tenant token 或用户密码。

- [ ] **步骤 4：验证 Web 读取与自动刷新行为**

在真实 Web 会话中打开交易页，使用另一个飞书 API 请求修改临时测试记录，保持 Web 页面不手动刷新，确认下一轮轮询后显示新值。随后删除测试记录并确认 Web 自动移除它。

- [ ] **步骤 5：最终验证和变更边界检查**

运行：

```bash
npm run verify
git diff --check
git status --short
git log -8 --oneline
```

预期：所有质量检查通过；无空白错误；工作树干净；临时飞书记录已删除。
