# 交易明细直接序号排序实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 删除独立“排序”字段，并让交易明细默认按飞书当前记录顺序倒序展示。

**架构：** 飞书记录请求通过 `FEISHU_TRANSACTIONS_VIEW_ID` 显式绑定网格视图，再使用非持久化的 `sourceOrder` 查询模式表达该视图的记录数组顺序。领域模型、表单与导出彻底移除 `sortOrder`，API 在筛选后按需要保留或反转来源顺序；代码部署兼容后再删除飞书字段。

**技术栈：** TypeScript、React、Zod、Vitest、Cloudflare Pages Functions、飞书 Base CLI

---

## 文件结构

- 修改 `src/domain/transaction-query.ts`：实现 `sourceOrder` 特殊排序。
- 修改 `src/domain/transaction.ts`：移除排序字段的模型与飞书读写映射。
- 修改 `functions/api/v1/transactions/[[path]].ts`：允许来源顺序查询并移除旧排序键。
- 修改 `src/pages/TransactionsPage.tsx`：默认及重置使用来源倒序。
- 修改 `src/features/transactions/TransactionList.tsx`：移除旧排序键类型。
- 修改 `src/features/transactions/TransactionDrawer.tsx`：移除排序输入。
- 修改 `src/domain/export.ts`：从 CSV/Excel 中移除排序列。
- 修改 `functions/_shared/env.ts` 与 `functions/_shared/feishu.ts`：要求交易视图 ID，并在记录请求中传递 `view_id`。
- 修改 `README.md`：记录交易视图环境变量和无“排序”字段的新结构。
- 修改对应 `*.test.ts(x)`：覆盖新排序与字段删除行为。

### 任务 1：用测试定义来源顺序

- [ ] **步骤 1：编写失败的领域测试**

在 `src/domain/transaction-query.test.ts` 中删除依赖 `sortOrder` 的用例，新增断言：输入 `[record-3, record-1, record-2]` 在 `sourceOrder + asc` 下保持原序，在 `sourceOrder + desc` 下得到 `[record-2, record-1, record-3]`，且输入数组不变；聚焦 `record-22` 时按倒序结果计算页码。

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- src/domain/transaction-query.test.ts`

预期：FAIL，类型或断言表明 `sourceOrder` 尚未实现。

- [ ] **步骤 3：实现最少来源排序逻辑**

将 `TransactionSortKey` 的 `sortOrder` 替换为 `sourceOrder`。筛选后执行：

```ts
const filtered = records.filter(/* 现有筛选 */);
const ordered =
  query.sort === 'sourceOrder'
    ? query.order === 'desc'
      ? [...filtered].reverse()
      : filtered
    : [...filtered].sort(/* 现有字段比较 */);
```

分页与 `focusId` 均改用 `ordered`。

- [ ] **步骤 4：运行领域测试验证通过**

运行：`npm test -- src/domain/transaction-query.test.ts`

预期：该文件全部 PASS。

- [ ] **步骤 5：提交任务 1**

```bash
git add src/domain/transaction-query.ts src/domain/transaction-query.test.ts
git commit -m "feat: 按飞书来源顺序排列交易（任务 1/3）"
```

### 任务 2：从应用移除排序字段

- [ ] **步骤 1：先修改失败测试**

更新交易映射、导出、抽屉和页面测试：`Transaction` 测试数据不再包含 `sortOrder`；写入映射预期不含“排序”；导出表头不含“排序”；抽屉不再出现“排序”标签；页面默认与重置请求为 `{ sort: 'sourceOrder', order: 'desc' }`。

- [ ] **步骤 2：运行相关测试验证失败**

运行：

```bash
npm test -- src/domain/transaction.test.ts src/domain/export.test.ts src/features/transactions/TransactionDrawer.test.tsx src/pages/TransactionsPage.test.tsx
```

预期：FAIL，失败点对应尚未移除的字段和旧默认查询。

- [ ] **步骤 3：实现最少代码**

从 `transactionSchema`、`Transaction`、`mapFeishuRecord`、`toFeishuFields`、编辑抽屉、导出列与列表排序键中移除 `sortOrder`；API 查询枚举将其替换为 `sourceOrder`；`DEFAULT_QUERY.sort` 改为 `sourceOrder`。环境模型新增必填 `transactionsViewId`，`listRecords` 请求参数加入 `view_id`。

- [ ] **步骤 4：运行相关测试和类型检查**

运行：

```bash
npm test -- src/domain/transaction.test.ts src/domain/export.test.ts src/features/transactions/TransactionDrawer.test.tsx src/pages/TransactionsPage.test.tsx
npm run typecheck
```

预期：全部 PASS，类型检查退出码为 0。

- [ ] **步骤 5：提交任务 2**

```bash
git add src functions
git commit -m "refactor: 移除交易排序字段（任务 2/3）"
```

### 任务 3：删除飞书字段并完成联调

- [ ] **步骤 1：读取删除命令帮助并再次确认目标**

运行 `lark-cli base +field-delete --help` 和字段列表命令，确认 Base `<FEISHU_BITABLE_APP_TOKEN>`、表 `<FEISHU_TRANSACTIONS_TABLE_ID>`、字段 `fldnnHnDwn` 的名称仍为“排序”。

- [ ] **步骤 2：删除并读回确认**

使用 `lark-cli base +field-delete ... --yes --as user` 删除该字段，再次列出字段；预期字段列表中不存在“排序”。

- [ ] **步骤 3：运行完整自动化验证**

运行：

```bash
npm test
npm run typecheck
npm run lint
npm run format
npm run build
```

预期：所有命令退出码为 0。

- [ ] **步骤 4：本地浏览器联调**

刷新本地应用，验证交易明细默认使用飞书来源倒序；从分析页展开产品并跳转，目标记录滚动到可视区且高亮约 1.5 秒，编辑抽屉不显示排序字段。

- [ ] **步骤 5：提交任务 3**

```bash
git add docs/superpowers/specs/2026-08-11-source-row-order-design.md docs/superpowers/plans/2026-08-11-source-row-order.md
git commit -m "docs: 记录直接序号排序方案（任务 3/3）"
```
