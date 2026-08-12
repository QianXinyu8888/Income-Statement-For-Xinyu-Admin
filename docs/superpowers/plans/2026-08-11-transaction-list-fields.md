# 交易明细完整字段展示实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在桌面端和手机端交易明细中直接展示指定的 11 个业务字段，并将分析页跳转后的订单高亮时长延长至 1.5 秒。

**架构：** `TransactionList` 继续接收同一组 `Transaction` 数据，桌面端渲染可横向滚动的完整表格，手机端渲染顶部摘要加常驻双列详情网格；不改变接口和领域模型。`TransactionsPage` 继续管理目标订单生命周期，只把清除时点改为 1500ms，并让 CSS 动画保持相同持续时间。

**技术栈：** React 18、TypeScript、CSS、Vitest、Testing Library。

---

## 文件结构

- 修改 `src/features/transactions/TransactionList.test.tsx`：验证桌面字段顺序、商品单元格内容和手机端完整字段值。
- 修改 `src/features/transactions/TransactionList.tsx`：渲染桌面端 11 个业务字段与手机端常驻详情网格。
- 修改 `src/styles.css`：为桌面宽表提供横向滚动，为手机详情提供双列布局，并将高亮动画改为 1.5 秒。
- 修改 `src/pages/TransactionsPage.test.tsx`：验证目标订单在 1499ms 时仍高亮、1500ms 时清除高亮。
- 修改 `src/pages/TransactionsPage.tsx`：将目标订单状态清除延时改为 1500ms。

### 任务 1：展示桌面端与手机端完整字段

**文件：**

- 修改：`src/features/transactions/TransactionList.test.tsx`
- 修改：`src/features/transactions/TransactionList.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：编写失败的完整字段组件测试**

在 `TransactionList.test.tsx` 中把测试记录的备注改为非空值：

```ts
note: '顺丰到付',
```

新增测试，先验证桌面表头顺序及购入日期不再嵌在商品按钮中：

```tsx
it('shows all desktop fields in the requested order', () => {
  const { container } = render(
    <TransactionList
      records={[record]}
      selected={new Set()}
      onToggle={vi.fn()}
      onOpen={vi.fn()}
      onSort={vi.fn()}
      sort="soldDate"
      order="desc"
    />,
  );

  const headers = [...container.querySelectorAll('.desktop-list th')]
    .map((cell) => cell.textContent?.trim())
    .filter(Boolean);
  expect(headers).toEqual([
    '商品名称',
    '交易状态',
    '购入日期',
    '售出日期',
    '持有天数',
    '购入成本',
    '运费',
    '总成本',
    '成交价',
    '利润',
    '备注',
  ]);
  expect(container.querySelector('.desktop-list .row-title')).toHaveTextContent(/^iPhone 15 Pro$/);
});
```

再新增手机端测试，在移动端区域内验证字段标签和值全部常驻：

```tsx
it('shows all transaction fields directly in the mobile card', () => {
  const { container } = render(
    <TransactionList
      records={[record]}
      selected={new Set()}
      onToggle={vi.fn()}
      onOpen={vi.fn()}
      onSort={vi.fn()}
      sort="soldDate"
      order="desc"
    />,
  );

  const mobile = container.querySelector('.mobile-list');
  expect(mobile).toHaveTextContent('iPhone 15 Pro');
  expect(mobile).toHaveTextContent('交易状态');
  expect(mobile).toHaveTextContent('购入日期2026-04-01');
  expect(mobile).toHaveTextContent('售出日期2026-08-10');
  expect(mobile).toHaveTextContent('持有天数131 天');
  expect(mobile).toHaveTextContent('购入成本¥4,100.00');
  expect(mobile).toHaveTextContent('运费¥18.00');
  expect(mobile).toHaveTextContent('总成本¥4,118.00');
  expect(mobile).toHaveTextContent('成交价¥5,200.00');
  expect(mobile).toHaveTextContent('利润+¥1,082.00');
  expect(mobile).toHaveTextContent('备注顺丰到付');
});
```

- [ ] **步骤 2：运行组件测试并确认失败**

运行：

```bash
npm test -- src/features/transactions/TransactionList.test.tsx
```

预期：FAIL；桌面表头仍只有现有字段，手机卡片缺少标签和值，商品按钮仍包含“购入 2026-04-01”。

- [ ] **步骤 3：实现桌面完整字段表格**

在 `TransactionList.tsx` 增加可复用的空值与金额显示函数：

```tsx
const display = (value: string | number | null) => value ?? '—';
const displayMoney = (value: number | null) => (value === null ? '—' : money.format(value));
```

将桌面表头改为复选框列之后严格排列 11 个业务字段。为领域层已支持的字段保留 `SortLabel`，为持有天数、运费和备注使用纯文本表头：

```tsx
<th><SortLabel field="title" label="商品名称" {...{ sort, order, onSort }} /></th>
<th><SortLabel field="status" label="交易状态" {...{ sort, order, onSort }} /></th>
<th><SortLabel field="purchaseDate" label="购入日期" {...{ sort, order, onSort }} /></th>
<th><SortLabel field="soldDate" label="售出日期" {...{ sort, order, onSort }} /></th>
<th className="number">持有天数</th>
<th className="number"><SortLabel field="costPrice" label="购入成本" {...{ sort, order, onSort }} /></th>
<th className="number">运费</th>
<th className="number"><SortLabel field="totalCost" label="总成本" {...{ sort, order, onSort }} /></th>
<th className="number"><SortLabel field="salePrice" label="成交价" {...{ sort, order, onSort }} /></th>
<th className="number"><SortLabel field="profit" label="利润" {...{ sort, order, onSort }} /></th>
<th>备注</th>
```

按同一顺序渲染行数据；商品按钮只包含名称，备注空字符串回退为“—”：

```tsx
<td className="product-cell">
  <button className="row-title" onClick={() => onOpen(record)}>
    {record.title ?? '—'}
  </button>
</td>
<td><StatusBadge status={record.status} /></td>
<td className="muted">{display(record.purchaseDate)}</td>
<td className="muted">{display(record.soldDate)}</td>
<td className="number muted">
  {record.holdingDays === null ? '—' : `${record.holdingDays} 天`}
</td>
<td className="number muted">{displayMoney(record.costPrice)}</td>
<td className="number muted">{displayMoney(record.shippingFee)}</td>
<td className="number muted">{displayMoney(record.totalCost)}</td>
<td className="number">{displayMoney(record.salePrice)}</td>
<td className="number"><Profit value={record.profit} visible={showProfit(record)} /></td>
<td className="note-cell">{record.note || '—'}</td>
```

- [ ] **步骤 4：实现手机端常驻详情网格**

把手机卡片的主内容改为独立标题按钮和 `dl` 详情。顶部保留商品名称与状态，并给交易状态提供显式标签；其余 9 个字段全部常驻：

```tsx
<div className="mobile-row__content">
  <button className="mobile-row__heading" onClick={() => onOpen(record)}>
    <strong>{record.title ?? '—'}</strong>
    <span className="mobile-row__status">
      <span className="sr-only">交易状态</span>
      <StatusBadge status={record.status} />
    </span>
  </button>
  <dl className="mobile-row__details">
    <div>
      <dt>购入日期</dt>
      <dd>{display(record.purchaseDate)}</dd>
    </div>
    <div>
      <dt>售出日期</dt>
      <dd>{display(record.soldDate)}</dd>
    </div>
    <div>
      <dt>持有天数</dt>
      <dd>{record.holdingDays === null ? '—' : `${record.holdingDays} 天`}</dd>
    </div>
    <div>
      <dt>购入成本</dt>
      <dd>{displayMoney(record.costPrice)}</dd>
    </div>
    <div>
      <dt>运费</dt>
      <dd>{displayMoney(record.shippingFee)}</dd>
    </div>
    <div>
      <dt>总成本</dt>
      <dd>{displayMoney(record.totalCost)}</dd>
    </div>
    <div>
      <dt>成交价</dt>
      <dd>{displayMoney(record.salePrice)}</dd>
    </div>
    <div>
      <dt>利润</dt>
      <dd>
        <Profit value={record.profit} visible={showProfit(record)} />
      </dd>
    </div>
    <div className="mobile-row__note">
      <dt>备注</dt>
      <dd>{record.note || '—'}</dd>
    </div>
  </dl>
</div>
```

- [ ] **步骤 5：实现宽表与手机卡片样式**

在 `styles.css` 中把 `.table-wrap` 改为横向滚动，并限定交易表格宽度和关键列宽：

```css
.table-wrap {
  overflow-x: auto;
}
.desktop-list table {
  min-width: 1480px;
}
.product-cell {
  min-width: 260px;
  max-width: 360px;
}
.note-cell {
  min-width: 180px;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

在现有 `max-width: 680px` 媒体查询中，让复选框顶部对齐，详情使用双列网格，备注跨两列：

```css
.mobile-row {
  align-items: flex-start;
  padding: 14px 12px;
}
.mobile-row > input {
  margin-top: 4px;
}
.mobile-row__content {
  flex: 1;
  min-width: 0;
}
.mobile-row__heading {
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0 0 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  text-align: left;
}
.mobile-row__heading strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mobile-row__details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
  margin: 0;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.mobile-row__details > div {
  min-width: 0;
}
.mobile-row__details dt {
  color: var(--muted);
  font-size: 11px;
}
.mobile-row__details dd {
  margin: 4px 0 0;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.mobile-row__note {
  grid-column: 1 / -1;
}
```

删除不再使用的 `.mobile-row > button`、`.mobile-row__top`、`.mobile-row__bottom` 和 `.row-title small` 规则，避免旧布局覆盖新结构。

- [ ] **步骤 6：运行组件测试并确认通过**

运行：

```bash
npm test -- src/features/transactions/TransactionList.test.tsx
```

预期：该文件全部测试 PASS，桌面表头顺序和手机完整字段断言通过。

- [ ] **步骤 7：提交完整字段布局**

```bash
git add src/features/transactions/TransactionList.tsx src/features/transactions/TransactionList.test.tsx src/styles.css
git commit -m "feat: 完善交易明细字段展示"
```

### 任务 2：将目标订单高亮延长至 1.5 秒

**文件：**

- 修改：`src/pages/TransactionsPage.test.tsx`
- 修改：`src/pages/TransactionsPage.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：先把页面测试改为验证 1.5 秒边界**

将现有定位测试名称改为 `loads the target page, scrolls to the order, and clears highlighting after 1.5 seconds`，并把计时断言改为：

```tsx
await act(async () => vi.advanceTimersByTimeAsync(1499));
expect(container.querySelector('.desktop-list [data-transaction-id="target"]')).toHaveAttribute(
  'data-focused',
  'true',
);

await act(async () => vi.advanceTimersByTimeAsync(1));
const targetDuringRefresh = container.querySelector('.desktop-list [data-transaction-id="target"]');
expect(targetDuringRefresh).toBeInTheDocument();
expect(targetDuringRefresh).not.toHaveAttribute('data-focused');
```

保留对查询参数清除、不打开抽屉、目标页不闪退以及刷新请求参数的原有断言。

- [ ] **步骤 2：运行页面测试并确认失败**

运行：

```bash
npm test -- src/pages/TransactionsPage.test.tsx
```

预期：FAIL；现有 1000ms 定时器会导致 1499ms 时目标已不再带有 `data-focused`。

- [ ] **步骤 3：实现 1500ms 状态与动画时长**

在 `TransactionsPage.tsx` 中修改清除延时：

```tsx
const timer = window.setTimeout(() => {
  setFocusedId(null);
  setQuery((current) => ({
    ...current,
    page: result.data?.page ?? current.page,
    focusId: undefined,
  }));
}, 1500);
```

在 `styles.css` 中同步动画时长：

```css
[data-focused='true'] {
  animation: focused-transaction 1.5s ease-out;
}
```

- [ ] **步骤 4：运行页面测试并确认通过**

运行：

```bash
npm test -- src/pages/TransactionsPage.test.tsx
```

预期：页面测试全部 PASS；1499ms 时仍高亮，1500ms 时清除，且目标记录在刷新等待期间仍留在列表中。

- [ ] **步骤 5：提交高亮时长修改**

```bash
git add src/pages/TransactionsPage.tsx src/pages/TransactionsPage.test.tsx src/styles.css
git commit -m "fix: 延长订单定位高亮时间"
```

### 任务 3：完整回归验证

**文件：**

- 验证：`src/features/transactions/TransactionList.tsx`
- 验证：`src/pages/TransactionsPage.tsx`
- 验证：`src/styles.css`

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
git log -5 --oneline
```

预期：工作区干净，无空白错误；最近提交依次包含规格、计划、完整字段布局和 1.5 秒高亮修改，且没有无关文件。
