# 连续月度利润倒序与主题顺序实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 让经营概览和利润分析的月度利润图都从当前月开始向右倒序展示，补齐所有缺失月份为零，并把设置页“跟随系统”移动到主题选项最右侧。

**架构：** 在现有 `monthly-profit-chart.ts` 中增加一个纯函数，统一完成月份校验、未来月份过滤、倒序补齐和零值占位；概览页和分析图共同消费该函数。现有但利润无效的月份通过额外状态保留“—”表达，只有接口完全缺少的月份才生成真实零值。

**技术栈：** React 18、TypeScript、Recharts、TanStack Query、Vitest、Testing Library。

---

## 文件结构

- 修改 `src/features/analytics/monthly-profit-chart.ts`：增加连续月份整理函数，并让图表数据保留无效利润月份。
- 修改 `src/features/analytics/monthly-profit-chart.test.ts`：覆盖空数据、稀疏数据、跨年、未来月份、空值与倒序。
- 修改 `src/features/analytics/MonthlyProfitChart.tsx`：让提示内容正确区分零利润和无有效利润。
- 修改 `src/features/analytics/MonthlyProfitChart.test.tsx`：验证当前月第一项、补齐月份和空值显示。
- 修改 `src/pages/OverviewPage.tsx`：移除页面独立升序排序，改用共用连续月份序列。
- 修改 `src/pages/OverviewPage.test.tsx`：验证当前月最左、连续补月和零利润。
- 修改 `src/pages/SettingsPage.tsx`：把主题选项顺序改为浅色、深色、跟随系统。
- 修改 `src/pages/SettingsPage.test.tsx`：验证主题 DOM 顺序和原有切换行为。

### 任务 1：共用连续月份整理函数

**文件：**
- 修改：`src/features/analytics/monthly-profit-chart.test.ts`
- 修改：`src/features/analytics/monthly-profit-chart.ts`

- [ ] **步骤 1：编写连续月份倒序的失败测试**

```ts
it('fills missing months from the current month to the earliest historical month', () => {
  const result = completeMonthlyProfitMonths(
    [
      { month: '2025-12', revenue: 800, profit: 300, count: 1 },
      { month: '2026-02', revenue: 1000, profit: 500, count: 2 },
      { month: '2026-04', revenue: 2000, profit: 900, count: 3 },
      { month: '2026-05', revenue: 3000, profit: 1200, count: 4 },
    ],
    '2026-04',
  );

  expect(result.map(({ month, profit, count }) => ({ month, profit, count }))).toEqual([
    { month: '2026-04', profit: 900, count: 3 },
    { month: '2026-03', profit: 0, count: 0 },
    { month: '2026-02', profit: 500, count: 2 },
    { month: '2026-01', profit: 0, count: 0 },
    { month: '2025-12', profit: 300, count: 1 },
  ]);
});
```

再添加两个独立测试：无有效数据时仅返回当前月零值；已有 `profit: null` 的月份保留 `null`，不会改成零。

- [ ] **步骤 2：运行测试并确认正确失败**

运行：`npm test -- src/features/analytics/monthly-profit-chart.test.ts`

预期：FAIL；`completeMonthlyProfitMonths` 尚未导出。

- [ ] **步骤 3：实现月份键解析与连续补齐**

```ts
function parseMonthKey(value: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return year > 0 ? year * 12 + month - 1 : null;
}

export function completeMonthlyProfitMonths(monthly: MonthlyItem[], currentMonth = currentMonthKey()) {
  const currentIndex = parseMonthKey(currentMonth)!;
  const byMonth = new Map<string, MonthlyItem>();
  // 只保留合法且不晚于当前月的第一条记录
  // 从 currentIndex 递减到最早索引；缺失键生成 revenue/profit/count 全零记录
}
```

月份键由整数索引反向格式化，不使用 UTC 日期转换。

- [ ] **步骤 4：运行测试确认通过并提交**

运行：`npm test -- src/features/analytics/monthly-profit-chart.test.ts`

预期：PASS。

```bash
git add src/features/analytics/monthly-profit-chart.ts src/features/analytics/monthly-profit-chart.test.ts
git commit -m "feat: 统一补齐月度利润连续月份（任务 1/3）"
```

### 任务 2：两处图表接入倒序序列

**文件：**
- 修改：`src/features/analytics/MonthlyProfitChart.tsx`
- 修改：`src/features/analytics/MonthlyProfitChart.test.tsx`
- 修改：`src/features/analytics/monthly-profit-chart.ts`
- 修改：`src/features/analytics/monthly-profit-chart.test.ts`
- 修改：`src/pages/OverviewPage.tsx`
- 修改：`src/pages/OverviewPage.test.tsx`

- [ ] **步骤 1：编写分析图和概览图的失败测试**

在 `MonthlyProfitChart.test.tsx` 固定本地时间为 2026 年 8 月，传入 2026-06 与 2026-08，断言刻度顺序为 8月、7月、6月，并断言 7 月显示 `¥0`。

在 `OverviewPage.test.tsx` 固定同一时间，返回 2026-06 与 2026-08，断言 DOM 中月份顺序为 `2026.08、2026.07、2026.06`，且 7 月可访问标签为“2026-07 利润：¥0.00”。

- [ ] **步骤 2：运行定向测试并确认正确失败**

运行：

```bash
npm test -- src/features/analytics/MonthlyProfitChart.test.tsx src/pages/OverviewPage.test.tsx
```

预期：FAIL；分析图仍保留接口顺序，概览图仍按最早到最新升序且不补 7 月。

- [ ] **步骤 3：让分析图数据构建使用共用序列**

`buildMonthlyProfitData` 先调用 `completeMonthlyProfitMonths`。每个 datum 增加 `hasProfit`：有限利润保留真实值；`null` 或非有限值用数值 0 供 Recharts 定位，但 `compactProfit` 为“—”，提示状态为“暂无”，金额显示“—”。缺失月份由整理函数生成有限的真实零值，因此继续显示 `¥0` 和“持平”。

- [ ] **步骤 4：让概览页使用共用序列**

```tsx
const monthly = useMemo(
  () => completeMonthlyProfitMonths(summary.data?.monthly ?? []),
  [summary.data?.monthly],
);
```

删除原来的 `localeCompare` 升序排序。保留现有金额、颜色、ARIA 标签和局部滚动。

- [ ] **步骤 5：运行两处图表测试确认通过并提交**

运行：

```bash
npm test -- src/features/analytics/monthly-profit-chart.test.ts src/features/analytics/MonthlyProfitChart.test.tsx src/pages/OverviewPage.test.tsx
```

预期：PASS。

```bash
git add src/features/analytics/monthly-profit-chart.ts src/features/analytics/monthly-profit-chart.test.ts src/features/analytics/MonthlyProfitChart.tsx src/features/analytics/MonthlyProfitChart.test.tsx src/pages/OverviewPage.tsx src/pages/OverviewPage.test.tsx
git commit -m "feat: 两处利润图按当前月向右倒序（任务 2/3）"
```

### 任务 3：主题顺序与最终验证

**文件：**
- 修改：`src/pages/SettingsPage.tsx`
- 修改：`src/pages/SettingsPage.test.tsx`

- [ ] **步骤 1：编写主题顺序的失败测试**

```tsx
const labels = within(theme)
  .getAllByRole('radio')
  .map((radio) => radio.closest('label')?.textContent?.trim());
expect(labels).toEqual(['浅色', '深色', '跟随系统']);
```

- [ ] **步骤 2：运行设置页测试并确认正确失败**

运行：`npm test -- src/pages/SettingsPage.test.tsx`

预期：FAIL；当前顺序为跟随系统、浅色、深色。

- [ ] **步骤 3：调整主题选项数组顺序**

```tsx
[
  ['light', '浅色'],
  ['dark', '深色'],
  ['system', '跟随系统'],
]
```

不修改偏好默认值和存储逻辑。

- [ ] **步骤 4：运行全量验证并提交**

运行：

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

预期：所有命令退出码为 0；构建只允许既有的包体积提示。

```bash
git add src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit -m "fix: 将跟随系统移动到主题选项最右侧（任务 3/3）"
```

- [ ] **步骤 5：应用内浏览器验收**

在 821px、680px 和 320px 下检查经营概览与利润分析：当前月份位于最左，向右月份连续倒序，补齐月份显示零利润，图表仅在内部横向滚动。检查设置页主题顺序为浅色、深色、跟随系统且文字完整。恢复浏览器原始视口后保持最终页面可供用户查看。
