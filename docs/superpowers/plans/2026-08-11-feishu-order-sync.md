# 交易明细飞书顺序同步实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 让交易页默认按飞书“交易明细”网格视图的“排序”字段升序展示，并确保空排序值稳定置后。

**架构：** `queryTransactions` 对 `sortOrder` 增加明确的空值置后规则，其他字段继续使用现有比较逻辑。`TransactionsPage` 的初始化与重置查询统一改为 `sortOrder + asc`；接口 schema 和客户端查询类型已支持该字段，不增加飞书请求。

**技术栈：** React 18、TypeScript、React Query、Vitest、Testing Library。

---

## 文件结构

- 修改 `src/domain/transaction-query.test.ts`：验证排序字段升序、空值置后、稳定顺序和定位分页。
- 修改 `src/domain/transaction-query.ts`：实现 `sortOrder` 空值稳定置后。
- 修改 `src/pages/TransactionsPage.test.tsx`：验证首次请求和重置筛选都使用飞书默认顺序。
- 修改 `src/pages/TransactionsPage.tsx`：统一默认与重置查询参数。

### 任务 1：实现飞书排序字段的稳定空值规则

**文件：**

- 修改：`src/domain/transaction-query.test.ts`
- 修改：`src/domain/transaction-query.ts`

- [ ] **步骤 1：编写失败的排序领域测试**

在 `transaction-query.test.ts` 新增测试，以乱序输入验证数值升序、空值置后，且相同值和空值保持原相对顺序：

```ts
it('sorts by the Feishu order field ascending with nulls last and stable ties', () => {
  const records = [
    { ...record(4), sortOrder: null },
    { ...record(2), sortOrder: 1 },
    { ...record(3), sortOrder: null },
    { ...record(1), sortOrder: 1 },
  ];

  const result = queryTransactions(records, {
    page: 1,
    pageSize: 20,
    sort: 'sortOrder',
    order: 'asc',
  });

  expect(result.items.map(({ id }) => id)).toEqual([
    'record-2',
    'record-1',
    'record-4',
    'record-3',
  ]);
});
```

把现有定位分页测试的排序参数改为飞书默认规则，并定位第 22 条记录：

```ts
const result = queryTransactions(records, {
  page: 1,
  pageSize: 20,
  sort: 'sortOrder',
  order: 'asc',
  focusId: 'record-22',
});

expect(result.page).toBe(2);
expect(result.items.some(({ id }) => id === 'record-22')).toBe(true);
expect(records[0].id).toBe('record-1');
```

- [ ] **步骤 2：运行领域测试并确认失败**

运行：

```bash
npm test -- src/domain/transaction-query.test.ts
```

预期：新增测试 FAIL；现有通用比较器把 `null` 转为空字符串，因此升序时空值被排到数值前面。

- [ ] **步骤 3：实现最小空值置后比较逻辑**

在 `queryTransactions` 的排序回调中，读取左右值后优先处理 `sortOrder` 空值：

```ts
const left = a[query.sort];
const right = b[query.sort];
if (query.sort === 'sortOrder') {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
}
const result =
  typeof left === 'number' && typeof right === 'number'
    ? left - right
    : String(left ?? '').localeCompare(String(right ?? ''), 'zh-CN');
return query.order === 'asc' ? result : -result;
```

相同数值和两个空值都返回 `0`，使用 JavaScript 稳定排序保留输入相对顺序；其他字段逻辑保持不变。

- [ ] **步骤 4：运行领域测试并确认通过**

运行：

```bash
npm test -- src/domain/transaction-query.test.ts
```

预期：该文件全部测试 PASS；定位订单仍在排序后得到正确分页，输入数组未被改写。

- [ ] **步骤 5：提交领域排序修改**

```bash
git add src/domain/transaction-query.ts src/domain/transaction-query.test.ts
git commit -m "fix: 对齐飞书交易排序规则（任务 1/2）"
```

### 任务 2：修改交易页默认与重置排序

**文件：**

- 修改：`src/pages/TransactionsPage.test.tsx`
- 修改：`src/pages/TransactionsPage.tsx`

- [ ] **步骤 1：编写失败的页面默认查询测试**

在 `TransactionsPage.test.tsx` 导入 `fireEvent`，新增测试。接口返回一条记录以渲染可排序表格：

```tsx
it('uses the Feishu table order by default and restores it when filters reset', async () => {
  vi.spyOn(apiClient, 'transactions').mockResolvedValue({
    items: [{ ...target, sortOrder: 1 }],
    total: 1,
    page: 1,
    pageSize: 20,
    warnings: [],
  });
  renderPage('/transactions');

  await waitFor(() =>
    expect(apiClient.transactions).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'sortOrder', order: 'asc' }),
    ),
  );

  fireEvent.click(screen.getByRole('button', { name: /成交价/ }));
  await waitFor(() =>
    expect(apiClient.transactions).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: 'salePrice', order: 'desc' }),
    ),
  );

  fireEvent.click(screen.getByRole('button', { name: /筛选/ }));
  fireEvent.click(screen.getByRole('button', { name: '重置筛选' }));
  await waitFor(() =>
    expect(apiClient.transactions).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      sort: 'sortOrder',
      order: 'asc',
    }),
  );
});
```

- [ ] **步骤 2：运行页面测试并确认失败**

运行：

```bash
npm test -- src/pages/TransactionsPage.test.tsx
```

预期：新增测试 FAIL；首次请求和重置请求仍使用 `soldDate + desc`。

- [ ] **步骤 3：统一页面默认查询参数**

在 `TransactionsPage.tsx` 定义只读默认查询常量：

```ts
const DEFAULT_QUERY = {
  page: 1,
  pageSize: 20,
  sort: 'sortOrder',
  order: 'asc',
} as const;
```

初始化查询时复用它并保留一次性定位参数：

```ts
const [query, setQuery] = useState<TransactionQuery>(() => ({
  ...DEFAULT_QUERY,
  focusId: searchParams.get('focus') || undefined,
}));
```

重置筛选时复用同一默认值：

```tsx
onClick={() => {
  setSearch('');
  setQuery({ ...DEFAULT_QUERY });
}}
```

- [ ] **步骤 4：运行页面测试并确认通过**

运行：

```bash
npm test -- src/pages/TransactionsPage.test.tsx
```

预期：页面测试全部 PASS；首次请求、临时列排序、重置排序和定位高亮均无回归。

- [ ] **步骤 5：提交页面默认排序修改**

```bash
git add src/pages/TransactionsPage.tsx src/pages/TransactionsPage.test.tsx
git commit -m "feat: 默认使用飞书交易顺序（任务 2/2）"
```

### 任务 3：完整回归验证

**文件：**

- 验证：`src/domain/transaction-query.ts`
- 验证：`src/pages/TransactionsPage.tsx`

- [ ] **步骤 1：运行完整质量检查**

运行：

```bash
npm test && npm run typecheck && npm run lint && npm run format && npm run build
```

预期：全部测试 PASS；类型检查、lint、格式检查和生产构建退出码均为 0。

- [ ] **步骤 2：检查变更边界与提交历史**

运行：

```bash
git status --short
git diff --check
git log -6 --oneline
```

预期：工作区干净，无空白错误；最近提交只包含本次排序规格、计划、领域排序和页面默认值修改。
