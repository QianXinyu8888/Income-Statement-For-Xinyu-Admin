# 月度利润横轴日期格式实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将经营概览和利润分析的月度利润横轴统一为单行四位年份加两位月份的 `YYYY.MM` 格式。

**架构：** 在现有月度利润纯函数模块新增共享格式化函数，分析图数据直接保存格式化后的轴标签，概览页删除自己的格式化实现并复用该函数。提示内容、排序、补月和利润计算不变。

**技术栈：** React 18、TypeScript、Recharts、Vitest、Testing Library。

---

## 文件结构

- 修改 `src/features/analytics/monthly-profit-chart.ts`：新增 `formatMonthAxisLabel` 并让图表 datum 提供单行轴标签。
- 修改 `src/features/analytics/monthly-profit-chart.test.ts`：验证标准月份、补零月份和异常输入。
- 修改 `src/features/analytics/MonthlyProfitChart.tsx`：横轴刻度改为单行共享标签。
- 修改 `src/features/analytics/MonthlyProfitChart.test.tsx`：验证 `2026.08、2026.07、2026.06` 顺序和当前月强调。
- 修改 `src/pages/OverviewPage.tsx`：删除页面本地格式化函数，复用共享函数。
- 修改 `src/pages/OverviewPage.test.tsx`：保持并明确两位月份断言。

### 任务 1：统一两处横轴日期格式

**文件：**
- 修改：`src/features/analytics/monthly-profit-chart.test.ts`
- 修改：`src/features/analytics/monthly-profit-chart.ts`
- 修改：`src/features/analytics/MonthlyProfitChart.test.tsx`
- 修改：`src/features/analytics/MonthlyProfitChart.tsx`
- 修改：`src/pages/OverviewPage.tsx`
- 修改：`src/pages/OverviewPage.test.tsx`

- [ ] **步骤 1：编写共享格式化函数和分析图的失败测试**

```ts
expect(formatMonthAxisLabel('2026-08')).toBe('2026.08');
expect(formatMonthAxisLabel('2026-12')).toBe('2026.12');
expect(formatMonthAxisLabel('invalid')).toBe('invalid');
```

把 `MonthlyProfitChart.test.tsx` 的刻度断言改为 `['2026.08', '2026.07', '2026.06']`，并继续断言当前月份刻度具有 `is-current`。

- [ ] **步骤 2：运行测试并确认正确失败**

运行：

```bash
npm test -- src/features/analytics/monthly-profit-chart.test.ts src/features/analytics/MonthlyProfitChart.test.tsx src/pages/OverviewPage.test.tsx
```

预期：FAIL；共享格式化函数尚不存在，分析图仍显示“26年 / 8月”。

- [ ] **步骤 3：实现共享格式与单行刻度**

```ts
export function formatMonthAxisLabel(value: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  return match ? `${match[1]}.${match[2]}` : value;
}
```

`MonthlyProfitDatum` 使用单个 `axisLabel` 字段替代 `yearLabel` 和 `monthLabel`；`MonthAxisTick` 只渲染一个 `<tspan>{item.axisLabel}</tspan>`。概览页导入并调用相同函数。

- [ ] **步骤 4：运行定向测试确认通过**

运行：

```bash
npm test -- src/features/analytics/monthly-profit-chart.test.ts src/features/analytics/MonthlyProfitChart.test.tsx src/pages/OverviewPage.test.tsx
```

预期：PASS。

- [ ] **步骤 5：运行完整验证并提交**

运行：

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

预期：全部退出码为 0；构建只允许既有包体积提示。

```bash
git add src/features/analytics/monthly-profit-chart.ts src/features/analytics/monthly-profit-chart.test.ts src/features/analytics/MonthlyProfitChart.tsx src/features/analytics/MonthlyProfitChart.test.tsx src/pages/OverviewPage.tsx src/pages/OverviewPage.test.tsx
git commit -m "fix: 统一月度利润横轴日期格式"
```

- [ ] **步骤 6：应用内浏览器验收**

在经营概览和利润分析页检查前三个标签为 `2026.08、2026.07、2026.06`；在 821px、680px 和 320px 下确认标签不裁切、图表仅内部横向滚动且页面无横向溢出。恢复原始视口并保留最终页面供用户查看。
