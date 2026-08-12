# 交易明细 Web 倒序调整实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 Web 端交易明细的默认“排序”字段方向由升序改为倒序，同时保持飞书视图不变、空值置后和现有交互不变。

**架构：** `TransactionsPage` 已使用同一个 `DEFAULT_QUERY` 驱动首次查询和重置筛选，只需把该常量的 `order` 改为 `desc`。`queryTransactions` 已在应用升降序方向前单独处理 `sortOrder` 空值，因此倒序下仍会把空值排在最后，无需修改领域实现。

**技术栈：** React 18、TypeScript、React Query、Vitest、Testing Library。

---

## 文件结构

- 修改 `src/pages/TransactionsPage.test.tsx`：将默认与重置排序预期改为 `sortOrder + desc`。
- 修改 `src/pages/TransactionsPage.tsx`：将统一默认查询常量改为倒序。
- 验证 `src/domain/transaction-query.test.ts`：确认现有空值置后和定位分页测试继续通过。

### 任务 1：将 Web 默认排序改为倒序

**文件：**

- 修改：`src/pages/TransactionsPage.test.tsx`
- 修改：`src/pages/TransactionsPage.tsx`

- [ ] **步骤 1：先把页面测试预期改为倒序**

将现有默认与重置测试重命名，并把首次请求和重置请求的 `order` 断言改为 `desc`：

```tsx
it('uses descending order by default and restores it when filters reset', async () => {
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
      expect.objectContaining({ sort: 'sortOrder', order: 'desc' }),
    ),
  );

  fireEvent.click(await screen.findByRole('button', { name: /成交价/ }));
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
      order: 'desc',
    }),
  );
});
```

- [ ] **步骤 2：运行页面测试并确认失败**

运行：

```bash
npm test -- src/pages/TransactionsPage.test.tsx
```

预期：测试 FAIL；当前 `DEFAULT_QUERY.order` 仍为 `asc`，首次请求无法满足倒序断言。

- [ ] **步骤 3：实现最小默认值修改**

在 `TransactionsPage.tsx` 中只修改统一默认查询常量：

```ts
const DEFAULT_QUERY = {
  page: 1,
  pageSize: 20,
  sort: 'sortOrder',
  order: 'desc',
} as const;
```

初始化和重置已经复用该常量，不修改其他查询、筛选或定位代码。

- [ ] **步骤 4：运行页面与领域测试并确认通过**

运行：

```bash
npm test -- src/pages/TransactionsPage.test.tsx src/domain/transaction-query.test.ts
```

预期：两个测试文件全部 PASS；页面首次与重置请求均为倒序，领域排序仍保持空值置后和定位分页正确。

- [ ] **步骤 5：提交 Web 倒序调整**

```bash
git add src/pages/TransactionsPage.tsx src/pages/TransactionsPage.test.tsx
git commit -m "fix: 交易明细默认倒序展示"
```

### 任务 2：完整回归验证

**文件：**

- 验证：`src/pages/TransactionsPage.tsx`
- 验证：`src/domain/transaction-query.ts`

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

预期：工作区干净，无空白错误；本次实现提交只修改交易页默认排序常量及其页面测试。
