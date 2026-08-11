# 空值兼容、财务口径与删除交互实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 完整展示飞书不完整交易数据，严格保留空值，统一总成本和退货统计口径，实现全量导出与可访问的应用内删除确认框。

**架构：** 读取模型与写入模型分离：飞书读取结果允许业务字段为 `null`，写入时只要求商品名称和交易状态；飞书公式字段始终只读。列表、分析和导出共用同一个容错映射函数，前端用独立确认对话框承接单条和批量删除。

**技术栈：** React 18、TypeScript、Zod、TanStack Query、Cloudflare Pages Functions、Vitest、Testing Library、ExcelJS。

---

## 文件结构

- 修改 `src/domain/transaction.ts`：定义可空读取模型、写入校验和无推导飞书映射。
- 修改 `src/domain/transaction.test.ts`：覆盖空值、未知字段和只写普通字段。
- 修改 `src/domain/analytics.ts`：按已售出/已退货分离统计，使用总成本和真实值。
- 修改 `src/domain/analytics.test.ts`：覆盖退货排除、退货损失、空值和不完整计数。
- 修改 `functions/api/v1/transactions/[[path]].ts`：列表保留不完整记录并提供全量导出接口。
- 修改 `functions/api/v1/analytics/summary.ts`：使用容错映射并保留统计警告。
- 修改 `src/api/client.ts`：声明全量导出响应和新的分析字段。
- 修改 `src/domain/export.ts`、`src/domain/export.test.ts`：导出空单元格和完整真实字段。
- 修改 `src/features/transactions/TransactionList.tsx`、对应测试：主表展示总成本，空值和未成交利润显示 `—`。
- 修改 `src/features/transactions/TransactionDrawer.tsx`：允许可选输入并显示只读预计总成本。
- 创建 `src/components/ConfirmDialog.tsx`、`src/components/ConfirmDialog.test.tsx`：应用内确认交互与焦点管理。
- 修改 `src/pages/TransactionsPage.tsx`：全量导出、单删/批量删除确认和错误状态。
- 修改 `src/pages/OverviewPage.tsx`、`src/pages/AnalyticsPage.tsx`：总成本、退货损失和不完整数据提示。
- 修改 `src/styles.css`：确认框、只读金额和响应式样式。

### 任务 1：建立严格保留空值的交易模型

**文件：**

- 修改：`src/domain/transaction.ts`
- 测试：`src/domain/transaction.test.ts`

- [ ] **步骤 1：编写失败的映射测试**

在 `src/domain/transaction.test.ts` 添加：

```ts
it('keeps missing Feishu values null without inventing defaults', () => {
  const { transaction, warnings } = mapFeishuRecord({
    record_id: 'rec-empty',
    fields: { 商品名称: '待补记录', 交易状态: ['已售出'] },
  });
  expect(transaction).toMatchObject({
    salePrice: null,
    costPrice: null,
    shippingFee: null,
    totalCost: null,
    profit: null,
    roi: null,
    purchaseDate: null,
    soldDate: null,
    holdingDays: null,
  });
  expect(warnings).toEqual([]);
});

it('returns an unknown status as null with a warning', () => {
  const result = mapFeishuRecord({
    record_id: 'rec-status',
    fields: { 商品名称: '商品', 交易状态: ['交易中'] },
  });
  expect(result.transaction.status).toBeNull();
  expect(result.warnings[0]).toContain('未知交易状态');
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- src/domain/transaction.test.ts`

预期：FAIL，`mapFeishuRecord` 尚未导出，现有映射还会把空成本和运费变为 `0`。

- [ ] **步骤 3：实现可空读取模型和独立写入模型**

在 `src/domain/transaction.ts` 定义：

```ts
export interface Transaction {
  id: string;
  title: string | null;
  status: TransactionStatus | null;
  salePrice: number | null;
  costPrice: number | null;
  shippingFee: number | null;
  totalCost: number | null;
  profit: number | null;
  roi: number | null;
  purchaseDate: string | null;
  soldDate: string | null;
  holdingDays: number | null;
  sortOrder: number | null;
  note: string | null;
  updatedAt?: string;
}

export const transactionSchema = z.object({
  title: z.string().trim().min(1, '请输入商品名称').max(500),
  status: z.enum(TRANSACTION_STATUSES),
  salePrice: money.nullable(),
  costPrice: money.nullable(),
  shippingFee: money.nullable(),
  purchaseDate: z.string().date().nullable(),
  soldDate: z.string().date().nullable(),
  sortOrder: z.number().finite().nullable(),
  note: z.string().trim().max(2000).nullable(),
});
```

实现 `mapFeishuRecord(record): { transaction: Transaction; warnings: string[] }`：空值返回 `null`；格式错误返回 `null` 并记录警告；不计算总成本、利润、ROI 或持有天数。`toFeishuFields` 只输出九个普通可写字段。

- [ ] **步骤 4：运行领域测试验证通过**

运行：`npm test -- src/domain/transaction.test.ts`

预期：该文件全部 PASS。

- [ ] **步骤 5：提交交易模型**

```bash
git add src/domain/transaction.ts src/domain/transaction.test.ts
git commit -m "fix: 严格保留飞书交易空值"
```

### 任务 2：修正经营统计与退货口径

**文件：**

- 修改：`src/domain/analytics.ts`
- 测试：`src/domain/analytics.test.ts`

- [ ] **步骤 1：编写失败的统计测试**

添加一条已售出、一条字段不完整的已售出、一条已退货和一条在售记录，断言：

```ts
expect(summary.count).toBe(2);
expect(summary.revenue).toBe(1000);
expect(summary.totalCost).toBe(710);
expect(summary.profit).toBe(290);
expect(summary.roi).toBeCloseTo(290 / 710);
expect(summary.returnCount).toBe(1);
expect(summary.returnLoss).toBe(45);
expect(summary.incompleteCount).toBe(1);
```

另加测试：当所有金额都为空时，`revenue`、`totalCost`、`profit`、`roi` 和 `returnLoss` 均为 `null`，而不是 `0`。

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- src/domain/analytics.test.ts`

预期：FAIL，现有接口没有 `totalCost`、`roi`、`returnCount`、`returnLoss` 或 `incompleteCount`。

- [ ] **步骤 3：实现真实值聚合**

将 `AnalyticsSummary` 核心字段定义为：

```ts
revenue: number | null;
totalCost: number | null;
shipping: number | null;
profit: number | null;
roi: number | null;
count: number;
returnCount: number;
returnLoss: number | null;
incompleteCount: number;
```

实现 `sumKnown`：没有真实数值时返回 `null`。普通指标只使用 `status === '已售出'`；退货损失只汇总 `status === '已退货' && profit < 0` 的绝对值。月度与利润区间跳过缺少对应真实字段的记录。

- [ ] **步骤 4：运行统计测试验证通过**

运行：`npm test -- src/domain/analytics.test.ts`

预期：全部 PASS。

- [ ] **步骤 5：提交统计口径**

```bash
git add src/domain/analytics.ts src/domain/analytics.test.ts
git commit -m "fix: 分离已售出利润与退货损失"
```

### 任务 3：保留全部记录并提供全量导出 API

**文件：**

- 修改：`functions/api/v1/transactions/[[path]].ts`
- 修改：`functions/api/v1/analytics/summary.ts`
- 修改：`src/api/client.ts`
- 修改：`src/domain/export.ts`
- 测试：`src/domain/export.test.ts`

- [ ] **步骤 1：编写失败的空值导出测试**

在 `src/domain/export.test.ts` 添加可空交易，断言 CSV 对应单元格为空且“总成本”列仍存在：

```ts
const csv = buildCsv([{ ...nullableRecord, totalCost: null, profit: null }]);
expect(csv).toContain('购入成本,运费,总成本,利润');
expect(csv).not.toContain('undefined');
expect(csv).not.toContain('null');
```

- [ ] **步骤 2：运行导出测试验证失败**

运行：`npm test -- src/domain/export.test.ts`

预期：FAIL，测试夹具与现有必填模型不兼容。

- [ ] **步骤 3：实现统一映射和全量接口**

在交易 Functions 中将所有飞书记录映射为：

```ts
const mapped = (await listRecords(config)).map(mapFeishuRecord);
const records = mapped.map(({ transaction }) => transaction);
const warnings = mapped.flatMap(({ warnings }) => warnings);
```

列表不再 `flatMap` 删除异常行。新增 `path === 'export' && request.method === 'GET'` 分支，返回 `{ items: records, total: records.length, warnings }`，且不读取任何筛选参数。

分析 Functions 使用同一个 `mapFeishuRecord`。前端 `apiClient.exportTransactions()` 请求 `/transactions/export`。

- [ ] **步骤 4：让 CSV/Excel 正确保留空单元格**

`row(record)` 直接输出可空字段；`safeCell(null)` 保持空字符串。Excel 数字格式只应用于列，不把空值转换为零。

- [ ] **步骤 5：运行相关测试和类型检查**

运行：`npm test -- src/domain/export.test.ts && npm run typecheck`

预期：全部 PASS，TypeScript 无错误。

- [ ] **步骤 6：提交 API 与导出模型**

```bash
git add 'functions/api/v1/transactions/[[path]].ts' functions/api/v1/analytics/summary.ts src/api/client.ts src/domain/export.ts src/domain/export.test.ts
git commit -m "feat: 提供全部飞书交易导出"
```

### 任务 4：主列表和编辑抽屉展示总成本

**文件：**

- 修改：`src/features/transactions/TransactionList.tsx`
- 修改：`src/features/transactions/TransactionList.test.tsx`
- 修改：`src/features/transactions/TransactionDrawer.tsx`

- [ ] **步骤 1：编写失败的列表测试**

断言表头为“总成本”，空利润显示 `—`，在售记录不会显示负成本：

```ts
expect(screen.getByRole('button', { name: /总成本/ })).toBeInTheDocument();
expect(screen.queryByText('-¥105.00')).not.toBeInTheDocument();
expect(screen.getAllByText('—').length).toBeGreaterThan(0);
```

- [ ] **步骤 2：运行组件测试验证失败**

运行：`npm test -- src/features/transactions/TransactionList.test.tsx`

预期：FAIL，当前表头仍是“成本”，并无可空利润渲染。

- [ ] **步骤 3：实现总成本与空值展示**

把排序键从 `costPrice` 改为 `totalCost`，桌面表格显示 `record.totalCost`。`Profit` 接受 `number | null`，仅在 `status === '已售出' && profit !== null` 时显示金额，否则显示 `—`。商品名、状态和日期为空时同样显示 `—`。

抽屉允许所有可选输入为空，增加只读“预计总成本”；只有购入成本存在时显示 `购入成本 + (运费 ?? 0)`，并明确标注“预计，保存后以飞书为准”。

- [ ] **步骤 4：运行列表和交易领域测试**

运行：`npm test -- src/features/transactions/TransactionList.test.tsx src/domain/transaction.test.ts`

预期：全部 PASS。

- [ ] **步骤 5：提交交易 UI**

```bash
git add src/features/transactions/TransactionList.tsx src/features/transactions/TransactionList.test.tsx src/features/transactions/TransactionDrawer.tsx
git commit -m "fix: 交易界面使用总成本与真实利润"
```

### 任务 5：实现应用内删除确认框

**文件：**

- 创建：`src/components/ConfirmDialog.tsx`
- 创建：`src/components/ConfirmDialog.test.tsx`
- 修改：`src/pages/TransactionsPage.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：编写失败的确认框测试**

使用 `@testing-library/user-event` 覆盖取消、Escape、确认和焦点恢复：

```ts
trigger.focus();
render(<ConfirmDialog open title="删除交易？" description="删除后无法恢复" confirmLabel="删除" onCancel={onCancel} onConfirm={onConfirm} returnFocusRef={ref} />);
expect(screen.getByRole('button', { name: '取消' })).toHaveFocus();
await user.keyboard('{Escape}');
expect(onCancel).toHaveBeenCalledOnce();
```

单独测试点击“删除”只调用一次 `onConfirm`，`pending` 时两个按钮均不可用。

- [ ] **步骤 2：运行确认框测试验证失败**

运行：`npm test -- src/components/ConfirmDialog.test.tsx`

预期：FAIL，组件文件尚不存在。

- [ ] **步骤 3：实现居中确认框与焦点管理**

组件使用 `role="alertdialog"`、`aria-modal="true"`、标题与描述 ID。打开时保存触发元素并聚焦取消按钮；`Tab` 和 `Shift+Tab` 在取消/删除之间循环；`Escape` 调用取消；卸载时恢复焦点。

- [ ] **步骤 4：替换所有 window.confirm**

`TransactionsPage` 新增：

```ts
type DeleteIntent = { kind: 'single'; record: Transaction } | { kind: 'batch'; count: number };
const [deleteIntent, setDeleteIntent] = useState<DeleteIntent | null>(null);
```

单删和批量删除按钮只设置 intent。确认对话框根据 intent 调用现有 mutation；失败时保留选择并显示错误通知。移除两处 `window.confirm`。

- [ ] **步骤 5：运行确认框和交易列表测试**

运行：`npm test -- src/components/ConfirmDialog.test.tsx src/features/transactions/TransactionList.test.tsx`

预期：全部 PASS。

- [ ] **步骤 6：提交删除交互**

```bash
git add src/components/ConfirmDialog.tsx src/components/ConfirmDialog.test.tsx src/pages/TransactionsPage.tsx src/styles.css
git commit -m "feat: 使用应用内删除确认对话框"
```

### 任务 6：接入全量导出和经营页面

**文件：**

- 修改：`src/pages/TransactionsPage.tsx`
- 修改：`src/pages/OverviewPage.tsx`
- 修改：`src/pages/AnalyticsPage.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：实现全量导出 mutation**

CSV 和 Excel 按钮调用 `apiClient.exportTransactions()`，拿到全部 `items` 后才调用 `downloadCsv` 或 `downloadExcel`。请求期间禁用两个按钮并显示“正在导出”；错误时设置 `notice` 为服务端错误，不使用当前页 `records` 兜底。

- [ ] **步骤 2：更新概览口径**

指标改为销售额、总成本、利润、ROI、成交笔数；可空金额统一显示 `—`。当 `incompleteCount > 0` 时显示“有 N 条已售出记录未参与部分金额统计”。

- [ ] **步骤 3：更新分析页退货信息**

在状态分布旁增加退货摘要：退货笔数、退货损失；`returnLoss === null` 显示 `—`。图表跳过 `profit === null` 的月份，不把空值绘制为零。

- [ ] **步骤 4：运行全部前端测试**

运行：`npm test -- --run`

预期：6 个以上测试文件全部 PASS，0 failures。

- [ ] **步骤 5：提交页面集成**

```bash
git add src/pages/TransactionsPage.tsx src/pages/OverviewPage.tsx src/pages/AnalyticsPage.tsx src/styles.css
git commit -m "feat: 接入全量导出与真实经营口径"
```

### 任务 7：完整验证与浏览器验收

**文件：**

- 修改：仅修复验证中发现且属于本规格的问题

- [ ] **步骤 1：运行静态与自动化验证**

```bash
npm run typecheck
npm run lint
npm run format
npm test -- --run
npm run build
```

预期：全部命令退出码为 0；测试 0 failures；生产构建完成。

- [ ] **步骤 2：启动 Cloudflare 本地环境**

运行：`npm run dev:pages`

预期：本地 Pages/Functions 地址可访问，API 使用 `.dev.vars` 中现有配置。

- [ ] **步骤 3：用应用内浏览器验收真实飞书数据**

核对交易总数等于飞书全表数量；抽查空日期、空成交价和空总成本记录均显示 `—`；在售记录不显示负利润；概览总成本来自飞书公式；退货不进入普通利润。

- [ ] **步骤 4：验收 CSV、Excel 与删除对话框**

在存在搜索条件和第 2 页状态下分别导出 CSV/Excel，确认文件仍包含飞书全部记录。桌面和 360px 手机验证单条/批量确认框、默认取消焦点、Escape、取消、确认、失败后选择保留。

- [ ] **步骤 5：清理测试数据并提交验证修复**

删除本轮创建的临时飞书交易和临时账号；确认 `git status --short` 只包含计划内文件。若有验证修复：

```bash
git add <计划内修复文件>
git commit -m "fix: 完成空值与财务口径验收"
```
