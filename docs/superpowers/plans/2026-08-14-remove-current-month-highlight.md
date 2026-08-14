# 移除月度利润图当前月高亮实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 删除月度利润图对当前月份的专属视觉与内部标记，使所有横轴月份标签完全一致。

**架构：** 继续由共享 `MonthlyProfitChart` 同时服务概览页和分析页，但从数据模型、渲染组件和样式表中移除 `isCurrentMonth` 分支。测试先约束横轴不再生成当前月专属类名或测试标记，再做最小实现。

**技术栈：** React、TypeScript、Recharts、Vitest、Testing Library、CSS

---

## 文件结构

- 修改：`src/features/analytics/MonthlyProfitChart.test.tsx` — 约束所有月份使用同一横轴样式。
- 修改：`src/features/analytics/monthly-profit-chart.test.ts` — 更新共享数据结构期望。
- 修改：`src/features/analytics/monthly-profit-chart.ts` — 删除当前月视觉标记字段及赋值。
- 修改：`src/features/analytics/MonthlyProfitChart.tsx` — 删除当前月专属类名和测试标记。
- 修改：`src/styles.css` — 删除当前月专属横轴样式。

### 任务 1：删除当前月专属标记与样式

**文件：**
- 修改：`src/features/analytics/MonthlyProfitChart.test.tsx`
- 修改：`src/features/analytics/monthly-profit-chart.test.ts`
- 修改：`src/features/analytics/monthly-profit-chart.ts`
- 修改：`src/features/analytics/MonthlyProfitChart.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：编写失败的组件测试**

将 `renders the current month as a single dotted year-month tick` 测试替换为以下断言，要求当前月继续显示为单行日期，但不再携带任何专属标记：

```tsx
it('renders every month with the same axis tick styling', () => {
  const { container } = render(<MonthlyProfitChart monthly={monthly} />);

  const ticks = [...container.querySelectorAll('.monthly-profit-chart__axis-tick')];
  expect(ticks[0]).toHaveTextContent('2026.08');
  expect(ticks[0]?.querySelectorAll('tspan')).toHaveLength(1);
  expect(container.querySelector('.monthly-profit-chart__axis-tick.is-current')).toBeNull();
  expect(screen.queryByTestId('current-month-tick')).not.toBeInTheDocument();
});
```

- [ ] **步骤 2：运行组件测试验证失败**

运行：

```bash
npm test -- src/features/analytics/MonthlyProfitChart.test.tsx
```

预期：FAIL；当前实现仍生成 `.is-current` 和 `data-testid="current-month-tick"`。

- [ ] **步骤 3：更新共享数据测试期望**

将月份顺序测试中的映射改为只检查月份和轴标签：

```ts
expect(result.map(({ month, axisLabel }) => ({ month, axisLabel }))).toEqual([
  { month: '2026-08', axisLabel: '2026.08' },
  { month: '2026-07', axisLabel: '2026.07' },
  { month: '2026-06', axisLabel: '2026.06' },
]);
```

- [ ] **步骤 4：编写最少实现代码**

从 `MonthlyProfitDatum` 删除：

```ts
isCurrentMonth: boolean;
```

从 `buildMonthlyProfitData` 的返回对象删除：

```ts
isCurrentMonth: item.month === currentMonth,
```

将横轴 `<g>` 简化为统一类名：

```tsx
<g className="monthly-profit-chart__axis-tick" transform={`translate(${x} ${y})`}>
```

从 `src/styles.css` 删除：

```css
.monthly-profit-chart__axis-tick.is-current text {
  fill: var(--text);
  font-weight: 750;
}
```

- [ ] **步骤 5：运行定向测试验证通过**

运行：

```bash
npm test -- src/features/analytics/monthly-profit-chart.test.ts src/features/analytics/MonthlyProfitChart.test.tsx
```

预期：两个测试文件全部 PASS，且不再出现当前月专属标记。

- [ ] **步骤 6：运行完整质量检查**

运行：

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

预期：全部退出码为 0；构建只允许项目已有的 Vite chunk-size 警告。

- [ ] **步骤 7：进行网页端响应式验证**

在 `http://localhost:8788/overview` 和 `http://localhost:8788/analytics` 分别验证：

- 当前月与相邻月份的颜色、字号、字重一致。
- 日期仍为 `YYYY.MM`，当前月仍位于最左侧。
- 320px、680px、821px 宽度下没有标签截断或页面横向溢出。

- [ ] **步骤 8：提交实现**

```bash
git add src/features/analytics/monthly-profit-chart.ts \
  src/features/analytics/monthly-profit-chart.test.ts \
  src/features/analytics/MonthlyProfitChart.tsx \
  src/features/analytics/MonthlyProfitChart.test.tsx \
  src/styles.css
git commit -m "fix: 移除月度利润图当前月高亮"
```
