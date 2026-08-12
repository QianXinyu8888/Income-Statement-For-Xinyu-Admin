# 分析卡片订单下钻实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在分析卡片中展开精简产品索引，并从产品名称跳转到交易页精确定位、滚动和高亮唯一订单 1 秒。

**架构：** 分析领域摘要为利润区间、状态和退货分组附加 `{ id, title }` 索引，分析页只管理展开状态和链接。交易列表查询增加 `focusId`，服务端在过滤排序后计算目标页；交易页消费一次性 URL 参数，把定位状态传给列表渲染并在 1 秒后清理。

**技术栈：** React 18、React Router、TanStack Query、TypeScript、Vitest、Testing Library、Zod、Cloudflare Pages Functions。

---

## 文件结构

- 修改 `src/domain/analytics.ts`：定义精简索引类型并让所有目标分组携带订单索引。
- 修改 `src/domain/analytics.test.ts`：验证分组归属、计数一致性和空标题保留。
- 创建 `src/pages/AnalyticsPage.test.tsx`：验证分析卡片展开、收起、禁用和产品深链接。
- 修改 `src/pages/AnalyticsPage.tsx`：渲染可访问的分组按钮与产品索引。
- 修改 `src/styles.css`：增加分析索引与目标订单高亮样式。
- 创建 `src/domain/transaction-query.ts`：集中实现交易筛选、排序、聚焦分页。
- 创建 `src/domain/transaction-query.test.ts`：验证跨页定位及无效 ID 降级。
- 修改 `functions/api/v1/transactions/[[path]].ts`：解析 `focusId` 并使用交易查询领域函数。
- 修改 `src/api/client.ts`：在交易查询类型与请求参数中支持 `focusId`。
- 修改 `src/api/client.test.ts`：验证 `focusId` 被正确编码到请求 URL。
- 修改 `src/features/transactions/TransactionList.tsx`：标记目标桌面行和移动卡片。
- 修改 `src/features/transactions/TransactionList.test.tsx`：验证两种响应式视图的目标标记。
- 创建 `src/pages/TransactionsPage.test.tsx`：验证滚动、1 秒高亮清理、不打开抽屉和 URL 清理。
- 修改 `src/pages/TransactionsPage.tsx`：消费一次性定位参数并协调目标页与高亮生命周期。

### 任务 1：为分析分组添加精简产品索引

**文件：**

- 修改：`src/domain/analytics.ts`
- 测试：`src/domain/analytics.test.ts`

- [ ] **步骤 1：编写失败的领域测试**

在测试中构造高收益、稳健盈利、平价回血、亏损、在售和退货记录，断言：

```ts
expect(summary.brackets.find(({ name }) => name === '高收益')?.items).toEqual([
  { id: 'high', title: '高收益产品' },
]);
expect(summary.statuses.find(({ status }) => status === '在售中')?.items).toEqual([
  { id: 'selling', title: null },
]);
expect(summary.returnItems).toEqual([{ id: 'returned', title: '退货产品' }]);
expect(summary.brackets.every((group) => group.count === group.items.length)).toBe(true);
```

- [ ] **步骤 2：运行测试并确认正确失败**

运行：`npm test -- src/domain/analytics.test.ts`

预期：FAIL，提示 `items` 或 `returnItems` 不存在。

- [ ] **步骤 3：实现最少领域变更**

在 `AnalyticsSummary` 中加入：

```ts
export interface AnalyticsOrderIndexItem {
  id: string;
  title: string | null;
}

statuses: Array<{
  status: TransactionStatus | null;
  count: number;
  items: AnalyticsOrderIndexItem[];
}>;
brackets: Array<{
  name: string;
  count: number;
  items: AnalyticsOrderIndexItem[];
}>;
returnItems: AnalyticsOrderIndexItem[];
```

聚合时按现有记录顺序把 `{ id, title }` 放入唯一匹配的利润区间、状态分组和退货索引，并用 `items.length` 生成计数。

- [ ] **步骤 4：运行领域测试确认通过**

运行：`npm test -- src/domain/analytics.test.ts`

预期：PASS，现有金额、月份和不完整记录测试仍通过。

- [ ] **步骤 5：提交领域变更**

```bash
git add src/domain/analytics.ts src/domain/analytics.test.ts
git commit -m "feat: 为分析分组返回订单索引"
```

### 任务 2：在分析卡片中展开产品名称

**文件：**

- 创建：`src/pages/AnalyticsPage.test.tsx`
- 修改：`src/pages/AnalyticsPage.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：编写失败的组件测试**

使用 QueryClient 与 MemoryRouter 渲染页面，并 mock `apiClient.summary` 返回任务 1 的摘要。验证：

```ts
expect(screen.queryByRole('link', { name: '高收益产品' })).not.toBeInTheDocument();
await user.click(screen.getByRole('button', { name: /高收益 1 笔/ }));
expect(screen.getByRole('link', { name: '高收益产品' })).toHaveAttribute(
  'href',
  '/transactions?focus=high',
);
await user.click(screen.getByRole('button', { name: /高收益 1 笔/ }));
expect(screen.queryByRole('link', { name: '高收益产品' })).not.toBeInTheDocument();
expect(screen.getByRole('button', { name: /亏损 0 笔/ })).toBeDisabled();
```

另断言 `title: null` 的展开项显示“未命名交易”。

- [ ] **步骤 2：运行组件测试并确认正确失败**

运行：`npm test -- src/pages/AnalyticsPage.test.tsx`

预期：FAIL，统计行当前不是按钮且不存在产品链接。

- [ ] **步骤 3：实现展开组件与样式**

在 `AnalyticsPage` 中维护唯一展开键：

```ts
const [expanded, setExpanded] = useState<string | null>(null);
```

抽取页面内 `DrilldownGroup`，按钮设置 `aria-expanded`、`aria-controls` 和 `disabled={!items.length}`；展开区域把每项渲染为：

```tsx
<Link to={`/transactions?focus=${encodeURIComponent(item.id)}`}>{item.title ?? '未命名交易'}</Link>
```

为索引增加边框、紧凑行高、内部最大高度与滚动；保持现有桌面和移动端网格样式。

- [ ] **步骤 4：运行组件与领域测试确认通过**

运行：`npm test -- src/pages/AnalyticsPage.test.tsx src/domain/analytics.test.ts`

预期：PASS，无 React 可访问性或状态警告。

- [ ] **步骤 5：提交分析页交互**

```bash
git add src/pages/AnalyticsPage.tsx src/pages/AnalyticsPage.test.tsx src/styles.css
git commit -m "feat: 支持分析卡片展开产品索引"
```

### 任务 3：按唯一订单 ID 计算目标分页

**文件：**

- 创建：`src/domain/transaction-query.ts`
- 创建：`src/domain/transaction-query.test.ts`
- 修改：`functions/api/v1/transactions/[[path]].ts`
- 修改：`src/api/client.ts`
- 修改：`src/api/client.test.ts`

- [ ] **步骤 1：编写失败的分页领域测试**

为 25 条已按售出日期降序排列的记录调用：

```ts
const result = queryTransactions(records, {
  page: 1,
  pageSize: 20,
  sort: 'soldDate',
  order: 'desc',
  focusId: 'record-on-page-2',
});
expect(result.page).toBe(2);
expect(result.items.some(({ id }) => id === 'record-on-page-2')).toBe(true);
```

再验证不存在的 `focusId` 保持请求页码，筛选和排序结果与当前 API 行为一致。

- [ ] **步骤 2：运行分页领域测试并确认正确失败**

运行：`npm test -- src/domain/transaction-query.test.ts`

预期：FAIL，模块或 `queryTransactions` 尚不存在。

- [ ] **步骤 3：实现纯交易查询函数**

定义 `TransactionListQuery` 与 `queryTransactions(records, query)`。函数依次完成文本/状态/日期筛选、现有字段排序，然后使用：

```ts
const focusIndex = query.focusId ? filtered.findIndex((record) => record.id === query.focusId) : -1;
const page = focusIndex >= 0 ? Math.floor(focusIndex / query.pageSize) + 1 : query.page;
const start = (page - 1) * query.pageSize;
```

返回 `{ items, total, page, pageSize }`，不修改输入数组。

- [ ] **步骤 4：接入服务端与客户端参数**

给 Functions 的 Zod 查询 schema 增加 `focusId: z.string().trim().min(1).optional()`，将 GET 列表中的筛选、排序、分页替换为 `queryTransactions`。给客户端 `TransactionQuery` 增加 `focusId?: string`；现有 URLSearchParams 逻辑自动编码参数。

在 `src/api/client.test.ts` 新增断言，请求包含 `focusId=record%2F2`。

- [ ] **步骤 5：运行查询与客户端测试确认通过**

运行：`npm test -- src/domain/transaction-query.test.ts src/api/client.test.ts`

预期：PASS，跨页定位、无效 ID 降级及 URL 编码均通过。

- [ ] **步骤 6：运行类型检查**

运行：`npm run typecheck`

预期：退出码 0，Functions 与客户端共享类型无错误。

- [ ] **步骤 7：提交精确分页能力**

```bash
git add src/domain/transaction-query.ts src/domain/transaction-query.test.ts functions/api/v1/transactions/'[[path]].ts' src/api/client.ts src/api/client.test.ts
git commit -m "feat: 支持按订单定位交易分页"
```

### 任务 4：交易页滚动并高亮目标订单 1 秒

**文件：**

- 修改：`src/features/transactions/TransactionList.tsx`
- 修改：`src/features/transactions/TransactionList.test.tsx`
- 创建：`src/pages/TransactionsPage.test.tsx`
- 修改：`src/pages/TransactionsPage.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：编写失败的列表标记测试**

给 `TransactionList` 传入 `focusedId="1"`，断言同一订单的桌面 `<tr>` 和移动端 `<article>` 都有 `data-focused="true"`，且其他订单没有该属性。

- [ ] **步骤 2：运行列表测试并确认正确失败**

运行：`npm test -- src/features/transactions/TransactionList.test.tsx`

预期：FAIL，`focusedId` 属性尚未定义。

- [ ] **步骤 3：实现列表目标标记和高亮样式**

给 `TransactionList` 增加 `focusedId?: string | null`，在两种响应式视图的目标元素上设置 `data-transaction-id` 与 `data-focused`。CSS 使用 `.is-focused` 或 `[data-focused='true']` 显示高亮；动画持续时间由页面的 1 秒状态控制，`prefers-reduced-motion` 仅取消颜色过渡。

- [ ] **步骤 4：编写失败的交易页生命周期测试**

用 MemoryRouter 初始地址 `/transactions?focus=target`、mock API 目标页响应、fake timers 与 `scrollIntoView` spy，断言：

```ts
expect(apiClient.transactions).toHaveBeenCalledWith(expect.objectContaining({ focusId: 'target' }));
expect(screen.getByTestId('transaction-target')).toHaveAttribute('data-focused', 'true');
expect(scrollIntoView).toHaveBeenCalled();
expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
await vi.advanceTimersByTimeAsync(1000);
expect(screen.getByTestId('transaction-target')).not.toHaveAttribute('data-focused', 'true');
expect(router.state.location.search).toBe('');
```

测试无效 ID 响应时不滚动且正常显示第一页。

- [ ] **步骤 5：运行交易页测试并确认正确失败**

运行：`npm test -- src/pages/TransactionsPage.test.tsx`

预期：FAIL，页面尚未解析 `focus` 或触发滚动与清理。

- [ ] **步骤 6：实现一次性定位生命周期**

`TransactionsPage` 使用 `useSearchParams` 读取 `focus`，初始化查询的 `focusId`。当响应包含目标时：

1. 把查询页码同步为响应的实际 `page` 并移除 `focusId`，保证后续分页正常。
2. 设置 `focusedId` 并在下一帧选择当前视口对应的 `[data-transaction-id]` 调用 `scrollIntoView({ behavior: 'smooth', block: 'center' })`。
3. 用 1000ms 定时器清除 `focusedId`。
4. 使用 `setSearchParams({}, { replace: true })` 移除一次性 URL 参数，同时保留将来可能存在的其他查询参数。

无效 ID 只清理参数与 `focusId`，不设置高亮或打开抽屉。

- [ ] **步骤 7：运行定向测试确认通过**

运行：`npm test -- src/pages/TransactionsPage.test.tsx src/features/transactions/TransactionList.test.tsx`

预期：PASS，高亮恰好在 1000ms 后清除，抽屉保持关闭。

- [ ] **步骤 8：提交交易页定位交互**

```bash
git add src/pages/TransactionsPage.tsx src/pages/TransactionsPage.test.tsx src/features/transactions/TransactionList.tsx src/features/transactions/TransactionList.test.tsx src/styles.css
git commit -m "feat: 跳转后定位并高亮交易订单"
```

### 任务 5：完整验证与交付检查

**文件：**

- 检查：本计划涉及的全部文件

- [ ] **步骤 1：运行全部单元测试**

运行：`npm test`

预期：全部测试 PASS，无未处理异常或 React `act` 警告。

- [ ] **步骤 2：运行静态检查**

运行：`npm run typecheck && npm run lint && npm run format`

预期：三个命令均以退出码 0 完成。

- [ ] **步骤 3：运行生产构建**

运行：`npm run build`

预期：TypeScript 与 Vite 构建成功，生成 `dist`，无构建错误。

- [ ] **步骤 4：检查变更边界**

运行：`git status --short && git diff --check && git log -5 --oneline`

预期：没有意外文件或空白错误，提交仅覆盖本规格与实现计划。
