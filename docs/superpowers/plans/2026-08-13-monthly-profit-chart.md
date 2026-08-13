# 月度利润柱形图重设计实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将利润分析页的月度图表改为可直接比较金额、以绿色和红色区分盈亏、且任何数据与屏幕尺寸下都不越出面板的柱形图。

**架构：** 新建专用 `MonthlyProfitChart` 组件承载 Recharts 渲染，并把数据清洗、月份标签、紧凑金额和 Y 轴范围计算放入同目录纯函数模块。`AnalyticsPage` 只传入接口返回的月度数据；图表组件负责过滤、局部横向滚动、颜色、标签和悬浮提示。

**技术栈：** React 18、TypeScript、Recharts 2.15、Vitest、Testing Library、CSS

---

## 文件结构

- 创建 `src/features/analytics/monthly-profit-chart.ts`：清洗月度数据并生成月份标签、金额文本、柱体状态和安全 Y 轴范围。
- 创建 `src/features/analytics/monthly-profit-chart.test.ts`：覆盖正常值、正负值、零值、跨年、极值与非有限数值。
- 创建 `src/features/analytics/MonthlyProfitChart.tsx`：渲染直接标数图、局部滚动区、金额标签和悬浮提示。
- 创建 `src/features/analytics/MonthlyProfitChart.test.tsx`：验证空状态、有效数据、画布宽度和可访问名称。
- 修改 `src/pages/AnalyticsPage.tsx`：用新组件替换内联 Recharts 图表。
- 修改 `src/pages/AnalyticsPage.test.tsx`：验证新标题和图表接入，并保留原有分析卡片行为。
- 修改 `src/styles.css`：增加图表专用样式、盈利强调色和滚动边界。

### 任务 1：月度利润数据与坐标范围纯函数

**文件：**

- 创建：`src/features/analytics/monthly-profit-chart.ts`
- 测试：`src/features/analytics/monthly-profit-chart.test.ts`

- [ ] **步骤 1：编写失败的格式化、清洗和范围测试**

```ts
import { describe, expect, it } from 'vitest';
import { buildMonthlyProfitData, formatCompactCny, getProfitDomain } from './monthly-profit-chart';

describe('monthly profit chart helpers', () => {
  it('formats bounded compact CNY labels', () => {
    expect(formatCompactCny(9600)).toBe('¥9,600');
    expect(formatCompactCny(12_400)).toBe('¥1.2 万');
    expect(formatCompactCny(-340_000_000)).toBe('-¥3.4 亿');
    expect(formatCompactCny(0)).toBe('¥0');
  });

  it('filters invalid values and labels year boundaries', () => {
    const result = buildMonthlyProfitData([
      { month: '2025-12', revenue: 1, profit: 1200, count: 1 },
      { month: '2026-01', revenue: 1, profit: -300, count: 1 },
      { month: '2026-02', revenue: 1, profit: Number.NaN, count: 1 },
      { month: '2026-03', revenue: 1, profit: null, count: 1 },
    ]);
    expect(result.map(({ monthLabel, profit, sign }) => ({ monthLabel, profit, sign }))).toEqual([
      { monthLabel: '2025 年 12 月', profit: 1200, sign: 'positive' },
      { monthLabel: '2026 年 1 月', profit: -300, sign: 'negative' },
    ]);
  });

  it('reserves fifteen percent on populated sides', () => {
    expect(getProfitDomain([100, 200])).toEqual([0, 230]);
    expect(getProfitDomain([-200, -100])).toEqual([-230, 0]);
    expect(getProfitDomain([-100, 200])).toEqual([-115, 230]);
    expect(getProfitDomain([0])).toEqual([-1, 1]);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- src/features/analytics/monthly-profit-chart.test.ts`

预期：FAIL，提示无法解析 `./monthly-profit-chart`。

- [ ] **步骤 3：实现最少纯函数**

```ts
import type { AnalyticsSummary } from '../../domain/analytics';

type MonthlyItem = AnalyticsSummary['monthly'][number];
export type ProfitSign = 'positive' | 'negative' | 'zero';
export type MonthlyProfitDatum = MonthlyItem & {
  profit: number;
  monthLabel: string;
  compactProfit: string;
  sign: ProfitSign;
  isHighestPositive: boolean;
};

export function formatCompactCny(value: number) {
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);
  const trim = (number: number) => number.toFixed(1).replace(/\.0$/, '');
  if (absolute >= 100_000_000) return `${sign}¥${trim(absolute / 100_000_000)} 亿`;
  if (absolute >= 10_000) return `${sign}¥${trim(absolute / 10_000)} 万`;
  return `${sign}¥${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(absolute)}`;
}

export function getProfitDomain(values: number[]): [number, number] {
  const finite = values.filter(Number.isFinite);
  const minimum = Math.min(0, ...finite);
  const maximum = Math.max(0, ...finite);
  if (minimum === 0 && maximum === 0) return [-1, 1];
  return [minimum < 0 ? minimum * 1.15 : 0, maximum > 0 ? maximum * 1.15 : 0];
}

export function buildMonthlyProfitData(monthly: MonthlyItem[]): MonthlyProfitDatum[] {
  const valid = monthly.filter(
    (item): item is MonthlyItem & { profit: number } =>
      item.profit !== null && Number.isFinite(item.profit),
  );
  const highestPositive = Math.max(0, ...valid.map((item) => item.profit));
  let previousYear = '';
  return valid.map((item, index) => {
    const [year, rawMonth] = item.month.split('-');
    const month = Number(rawMonth);
    const showYear = index === 0 || year !== previousYear;
    previousYear = year;
    return {
      ...item,
      profit: item.profit,
      monthLabel: showYear ? `${year} 年 ${month} 月` : `${month} 月`,
      compactProfit: formatCompactCny(item.profit),
      sign: item.profit > 0 ? 'positive' : item.profit < 0 ? 'negative' : 'zero',
      isHighestPositive: item.profit > 0 && item.profit === highestPositive,
    };
  });
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test -- src/features/analytics/monthly-profit-chart.test.ts`

预期：PASS，3 个测试通过。

- [ ] **步骤 5：提交纯函数与测试**

```bash
git add src/features/analytics/monthly-profit-chart.ts src/features/analytics/monthly-profit-chart.test.ts
git commit -m "feat: 增加月度利润图表数据处理"
```

### 任务 2：直接标数图表组件

**文件：**

- 创建：`src/features/analytics/MonthlyProfitChart.tsx`
- 测试：`src/features/analytics/MonthlyProfitChart.test.tsx`

- [ ] **步骤 1：编写失败的组件边界测试**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MonthlyProfitChart } from './MonthlyProfitChart';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
const monthly = Array.from({ length: 10 }, (_, index) => ({
  month: `2026-${String(index + 1).padStart(2, '0')}`,
  revenue: 1000,
  profit: index === 1 ? -500 : (index + 1) * 1000,
  count: 1,
}));

describe('MonthlyProfitChart', () => {
  it('keeps a wide series inside a local scroller', () => {
    render(<MonthlyProfitChart monthly={monthly} />);
    expect(screen.getByRole('img', { name: '月度利润趋势图' })).toBeInTheDocument();
    expect(screen.getByTestId('monthly-profit-scroll')).toHaveClass('monthly-profit-chart__scroll');
    expect(screen.getByTestId('monthly-profit-canvas')).toHaveStyle({ width: '840px' });
  });

  it('shows an empty state when every profit is invalid', () => {
    render(<MonthlyProfitChart monthly={[{ ...monthly[0], profit: null }]} />);
    expect(screen.getByText('暂无可用利润数据')).toBeInTheDocument();
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- src/features/analytics/MonthlyProfitChart.test.tsx`

预期：FAIL，提示无法解析 `./MonthlyProfitChart`。

- [ ] **步骤 3：实现组件**

实现 `MonthlyProfitChart`，固定使用以下配置：

- `buildMonthlyProfitData(monthly)` 过滤数据，空数组显示既有空状态。
- 画布宽度为 `Math.max(620, data.length * 84)`，仅 `.monthly-profit-chart__scroll` 使用横向滚动。
- `BarChart` margin 为 `{ top: 34, right: 56, bottom: 10, left: 56 }`。
- 隐藏 Y 轴文字但传入 `getProfitDomain`，用 `ReferenceLine y={0}` 显示零线。
- `Cell` 正值填充 `var(--profit)`、负值填充 `var(--loss)`、零值填充 `var(--muted)`。
- 最高正值增加 `stroke="var(--profit-strong)"` 和 `strokeWidth={2}`。
- `LabelList` 使用文件内 `ProfitValueLabel`：正值标签位于柱顶上方，负值位于柱底下方，文本为 `compactProfit`；根据 `viewBox` 将最终 `y` 坐标限制在绘图区上下边界内，若外部位置会被裁切则把标签移入柱体。
- `Tooltip` 使用文件内 `ProfitTooltip`，仅显示完整月份和现有 `money` 规则的人民币金额；设置 `allowEscapeViewBox={{ x: false, y: false }}`，容器类名为 `monthly-profit-tooltip`。
- 根容器保留 `role="img" aria-label="月度利润趋势图"`。

- [ ] **步骤 4：运行组件测试、类型检查并修正 Recharts 属性类型**

运行：

```bash
npm test -- src/features/analytics/MonthlyProfitChart.test.tsx
npm run typecheck
```

预期：2 个测试 PASS，TypeScript 无错误。

- [ ] **步骤 5：提交组件与测试**

```bash
git add src/features/analytics/MonthlyProfitChart.tsx src/features/analytics/MonthlyProfitChart.test.tsx
git commit -m "feat: 新增直接标数月度利润图表"
```

### 任务 3：页面接入、样式与完整验证

**文件：**

- 修改：`src/pages/AnalyticsPage.tsx`
- 修改：`src/pages/AnalyticsPage.test.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：扩充失败的页面测试**

把摘要的 `monthly` 测试数据改为一个正值和一个负值，并增加：

```tsx
expect(await screen.findByRole('heading', { name: '月度利润' })).toBeInTheDocument();
expect(screen.getByText('按月对比')).toBeInTheDocument();
expect(screen.getByRole('img', { name: '月度利润趋势图' })).toBeInTheDocument();
expect(screen.getByTestId('monthly-profit-scroll')).toBeInTheDocument();
```

- [ ] **步骤 2：运行页面测试验证失败**

运行：`npm test -- src/pages/AnalyticsPage.test.tsx`

预期：FAIL，页面仍显示“月度趋势”，且没有 `monthly-profit-scroll`。

- [ ] **步骤 3：替换页面内联图表**

从 `AnalyticsPage.tsx` 移除 Recharts 导入，导入 `MonthlyProfitChart`，并把月度面板替换为：

```tsx
<section className="panel panel--wide monthly-profit-panel">
  <header>
    <div>
      <h2>月度利润</h2>
      <span>按月对比</span>
    </div>
  </header>
  <MonthlyProfitChart monthly={summary.data!.monthly} />
</section>
```

- [ ] **步骤 4：增加不越界样式**

在 `src/styles.css` 现有图表规则附近添加：

```css
:root {
  --profit-strong: #0f7a42;
}
[data-theme='dark'] {
  --profit-strong: #79e6a8;
}
.monthly-profit-panel {
  overflow: hidden;
}
.monthly-profit-panel > header > div {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.monthly-profit-chart {
  max-width: 100%;
  margin-top: 18px;
}
.monthly-profit-chart__scroll {
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-inline: contain;
}
.monthly-profit-chart__canvas {
  height: 330px;
  max-width: none;
}
.monthly-profit-chart__label {
  fill: var(--text);
  font-size: 11px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
.monthly-profit-tooltip {
  max-width: min(220px, calc(100vw - 32px));
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
  box-shadow: var(--shadow-float);
}
.monthly-profit-tooltip strong {
  display: block;
  margin-top: 3px;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 720px) {
  .monthly-profit-chart__canvas {
    height: 300px;
  }
}
```

只在准确定位后修改 `src/styles.css`，保留其中当前已有的用户改动。

- [ ] **步骤 5：运行相关验证并提交**

```bash
npm test -- src/features/analytics/monthly-profit-chart.test.ts src/features/analytics/MonthlyProfitChart.test.tsx src/pages/AnalyticsPage.test.tsx
npm run typecheck
npx prettier --write src/features/analytics/monthly-profit-chart.ts src/features/analytics/monthly-profit-chart.test.ts src/features/analytics/MonthlyProfitChart.tsx src/features/analytics/MonthlyProfitChart.test.tsx src/pages/AnalyticsPage.tsx src/pages/AnalyticsPage.test.tsx src/styles.css
npm run lint
git add src/features/analytics src/pages/AnalyticsPage.tsx src/pages/AnalyticsPage.test.tsx src/styles.css
git commit -m "feat: 重设计月度利润柱形图"
```

预期：相关测试、类型检查和 lint 全部通过，格式化命令只改动任务文件。

- [ ] **步骤 6：运行完整自动化验证**

```bash
npm test
npm run typecheck
npm run lint
npm run format
npm run build
```

预期：全部退出码为 0，生产构建生成 `dist`。

- [ ] **步骤 7：浏览器检查桌面与手机边界**

运行 `npm run dev:pages -- --port 8790`，在利润分析页分别检查桌面宽度和 390×844 手机视口。必须满足：页面根节点 `scrollWidth === clientWidth`；只有 `.monthly-profit-chart__scroll` 在月份较多时满足 `scrollWidth > clientWidth`；首尾金额标签、月份标签和 tooltip 完整位于面板内；盈利柱为绿色、亏损柱为红色、零值为中性色、最高盈利柱有深色描边；浅色和深色主题均无控制台错误。

- [ ] **步骤 8：视觉修复后重新验证并提交**

若步骤 7 发现问题，只修改图表组件、测试或专用样式，重新运行步骤 6 的全部命令，然后提交：

```bash
git add src/features/analytics src/pages/AnalyticsPage.tsx src/pages/AnalyticsPage.test.tsx src/styles.css
git commit -m "fix: 收紧月度利润图表显示边界"
```

若无需修复则不创建空提交。只有完整验证再次通过后才能宣布完成。
