# 分析月份弹窗与主题响应式修复实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 用自定义年月弹窗替代分析页原生月份输入，把“回到本月”移入弹窗并保持始终可操作，同时修复设置页“跟随系统”在中窄网页视口被裁切的问题。

**架构：** `AnalysisMonthControl` 负责弹窗的展示年份、月份网格、关闭与焦点行为；`AnalyticsPage` 继续持有偏好和查询，并在当前已是本月时显式刷新查询。响应式形态全部由局部 CSS 控制：桌面锚定弹窗、680px 及以下底部弹层，设置页主题控件改为稳定三列网格。

**技术栈：** React 18、TypeScript、TanStack Query、Vitest、Testing Library、CSS 媒体查询。

---

## 文件结构

- 修改 `src/features/analytics/AnalysisMonthControl.tsx`：实现月份触发按钮、年份导航、12 个月按钮、回到本月、焦点恢复和关闭行为。
- 创建 `src/features/analytics/AnalysisMonthControl.test.tsx`：隔离验证弹窗打开、年份导航、月份选择、回到本月、外部点击、`Esc` 和焦点恢复。
- 修改 `src/pages/AnalyticsPage.tsx`：区分“切换到本月”和“已是本月时刷新”，保持现有月份查询数据流。
- 修改 `src/pages/AnalyticsPage.test.tsx`：把原生输入测试改成弹窗交互测试，并验证本月状态下仍可重新查询。
- 修改 `src/styles.css`：增加月份弹窗的桌面/手机布局并修复主题分段控件收缩裁切。

### 任务 1：月份弹窗交互

**文件：**
- 创建：`src/features/analytics/AnalysisMonthControl.test.tsx`
- 修改：`src/features/analytics/AnalysisMonthControl.tsx`

- [ ] **步骤 1：编写打开、选月和年份导航的失败测试**

```tsx
it('opens a month dialog, navigates years and selects a month', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <AnalysisMonthControl
      value="2026-08"
      currentMonth="2026-08"
      onChange={onChange}
      onReset={vi.fn()}
    />,
  );

  const trigger = screen.getByRole('button', { name: '选择分析月份，当前为 2026 年 8 月' });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await user.click(trigger);
  expect(screen.getByRole('dialog', { name: '选择分析月份' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: '上一年' }));
  expect(screen.getByText('2025 年')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '选择 2025 年 2 月' }));
  expect(onChange).toHaveBeenCalledWith('2025-02');
  expect(screen.queryByRole('dialog', { name: '选择分析月份' })).not.toBeInTheDocument();
});
```

- [ ] **步骤 2：运行定向测试并确认正确失败**

运行：`npm test -- src/features/analytics/AnalysisMonthControl.test.tsx`

预期：FAIL；当前组件只有原生 `input[type="month"]`，找不到月份触发按钮和弹窗。

- [ ] **步骤 3：实现最小月份弹窗**

在组件中使用 `useEffect`、`useId`、`useRef`、`useState` 和 Lucide 图标，提供以下结构和行为：

```tsx
const [open, setOpen] = useState(false);
const [displayYear, setDisplayYear] = useState(Number(value.slice(0, 4)));
const months = Array.from({ length: 12 }, (_, index) => index + 1);

function selectMonth(month: number) {
  onChange(`${displayYear}-${String(month).padStart(2, '0')}`);
  setOpen(false);
  requestAnimationFrame(() => triggerRef.current?.focus());
}
```

触发按钮显示格式化后的“YYYY 年 M 月”；弹窗使用 `role="dialog"` 和“选择分析月份”标题；年份导航仅改变弹窗浏览年份；12 个按钮调用 `selectMonth`。

- [ ] **步骤 4：运行定向测试确认通过**

运行：`npm test -- src/features/analytics/AnalysisMonthControl.test.tsx`

预期：PASS；无 React 警告。

- [ ] **步骤 5：编写关闭、焦点与回到本月的失败测试**

```tsx
it('keeps reset available and restores focus after reset or escape', async () => {
  const user = userEvent.setup();
  const onReset = vi.fn();
  render(
    <AnalysisMonthControl
      value="2026-08"
      currentMonth="2026-08"
      onChange={vi.fn()}
      onReset={onReset}
    />,
  );

  const trigger = screen.getByRole('button', { name: /选择分析月份/ });
  await user.click(trigger);
  const reset = screen.getByRole('button', { name: '回到本月' });
  expect(reset).toBeEnabled();
  await user.click(reset);
  expect(onReset).toHaveBeenCalledOnce();
  expect(trigger).toHaveFocus();

  await user.click(trigger);
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog', { name: '选择分析月份' })).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
```

另加一个测试：打开弹窗后点击组件外部元素，弹窗关闭并恢复触发按钮焦点。

- [ ] **步骤 6：运行定向测试并确认正确失败**

运行：`npm test -- src/features/analytics/AnalysisMonthControl.test.tsx`

预期：FAIL；最小弹窗尚未实现始终可用的回到本月、外部点击和完整焦点恢复。

- [ ] **步骤 7：实现关闭和焦点行为**

```tsx
function closeAndRestoreFocus() {
  setOpen(false);
  requestAnimationFrame(() => triggerRef.current?.focus());
}

function resetToCurrentMonth() {
  onReset();
  closeAndRestoreFocus();
}
```

弹窗打开时注册 `pointerdown` 和 `keydown` 监听器；组件外 `pointerdown` 或 `Escape` 调用 `closeAndRestoreFocus`，清理 effect 时移除监听器。打开后将焦点移到当前选中月份按钮，没有对应按钮时聚焦弹窗标题后的第一个月份按钮。

- [ ] **步骤 8：运行定向测试确认全部通过并提交**

运行：`npm test -- src/features/analytics/AnalysisMonthControl.test.tsx`

预期：PASS。

```bash
git add src/features/analytics/AnalysisMonthControl.tsx src/features/analytics/AnalysisMonthControl.test.tsx
git commit -m "feat: 添加分析月份选择弹窗"
```

### 任务 2：接入分析查询与本月刷新

**文件：**
- 修改：`src/pages/AnalyticsPage.test.tsx`
- 修改：`src/pages/AnalyticsPage.tsx`

- [ ] **步骤 1：改写页面月份流程的失败测试**

用假时间固定在 2026 年 8 月，打开“2026 年 8 月”触发按钮，切换到 2026 年 2 月，并验证 `summary('2026-02-01', '2026-02-28')`。卸载重挂载后验证触发按钮恢复为“2026 年 2 月”；打开弹窗点击“回到本月”，验证查询本月。

再添加独立测试：初始已经为本月时打开弹窗点击“回到本月”，记录点击前本月汇总请求次数，并等待次数增加 1。

- [ ] **步骤 2：运行页面测试并确认正确失败**

运行：`npm test -- src/pages/AnalyticsPage.test.tsx`

预期：FAIL；页面当前仍按旧组件接口处理重置，本月值不变时不会显式重新查询。

- [ ] **步骤 3：实现本月重置分支**

```tsx
onReset={() => {
  if (analysisMonth === thisMonth) {
    void summary.refetch();
    return;
  }
  setAnalysisMonth(thisMonth);
}}
```

保持 `queryKey: ['summary', from, to]` 和现有自然月边界函数不变。

- [ ] **步骤 4：运行组件与页面测试确认通过并提交**

运行：`npm test -- src/features/analytics/AnalysisMonthControl.test.tsx src/pages/AnalyticsPage.test.tsx`

预期：PASS。

```bash
git add src/pages/AnalyticsPage.tsx src/pages/AnalyticsPage.test.tsx
git commit -m "fix: 保持本月重置操作可用"
```

### 任务 3：响应式样式与主题截断修复

**文件：**
- 修改：`src/styles.css`

- [ ] **步骤 1：写入最小桌面弹窗样式**

为 `.analysis-month-control` 建立相对定位；为触发按钮、弹窗、年份导航、月份三列网格、选中月份、本月标记和底部操作区定义局部样式。弹窗桌面宽度不超过 `min(320px, calc(100vw - 32px))`，月份按钮最小高度 44px。

- [ ] **步骤 2：写入手机底部弹层样式**

在 `@media (max-width: 680px)` 内把弹窗改为 `position: fixed`，贴合视口底部，宽度 100%，加入 `env(safe-area-inset-bottom)`，圆角仅保留顶部两角。页头中的月份触发按钮可以占满下一行，但不得继承旧原生输入的整行规则。

- [ ] **步骤 3：修复主题分段控件**

将 `.theme-segmented` 改为 `display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); width: min(100%, 300px)`；移除文字省略规则，确保每个选项 44px 高。在中窄布局中让设置项允许换行，并使 `dd` 与主题控件获得整行可用宽度。

- [ ] **步骤 4：执行静态检查与定向回归并提交**

运行：

```bash
npm run typecheck
npm run lint
npm test -- src/features/analytics/AnalysisMonthControl.test.tsx src/pages/AnalyticsPage.test.tsx src/pages/SettingsPage.test.tsx
```

预期：全部通过且无警告。

```bash
git add src/styles.css
git commit -m "fix: 完善月份弹窗与主题控件响应式布局"
```

### 任务 4：全量与浏览器验收

**文件：**
- 验证：`src/features/analytics/AnalysisMonthControl.tsx`
- 验证：`src/pages/AnalyticsPage.tsx`
- 验证：`src/styles.css`

- [ ] **步骤 1：运行完整质量检查**

运行：

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check HEAD~3..HEAD
```

预期：所有命令退出码为 0。

- [ ] **步骤 2：运行最终版本并验证分析页**

在应用内浏览器依次使用 821px、680px、320px 和常规桌面宽度检查：月份触发按钮无溢出；桌面弹窗锚定正确；手机弹层完整；12 个月和“回到本月”均可操作；`Esc` 与点击外部可关闭。

- [ ] **步骤 3：验证设置页主题控件**

在 821px、680px 和 320px 检查“跟随系统 / 浅色 / 深色”全部显示完整，无省略、遮挡或页面级横向滚动。

- [ ] **步骤 4：检查最终提交状态**

运行：`git status --short && git log -5 --oneline`

预期：工作树干净，计划中的实现提交均位于 `main`。
