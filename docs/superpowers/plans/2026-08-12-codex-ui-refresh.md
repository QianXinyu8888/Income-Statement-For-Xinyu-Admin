# Codex 风格后台界面全面优化实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在保留现有数据流和业务功能的前提下，将全部后台界面实现为已确认的 Codex 风格设计，并让桌面、移动、浅色、深色和减少动画模式都达到可交付质量。

**架构：** 继续使用现有 React Router、React Query 和页面组件，以 CSS 自定义属性建立统一设计系统。AppShell 负责响应式导航，页面组件只调整语义结构与可复用样式钩子，交易列表继续保持桌面表格和移动列表双渲染，图表继续使用现有 HTML/CSS 与 Recharts 数据流。

**技术栈：** React 18、TypeScript、Vite、Vitest、Testing Library、React Query、React Router、Recharts、Lucide、CSS

---

## 文件结构与职责

- 修改 `src/styles.css`：主题令牌、排版、布局、组件外观、响应式规则和动效的唯一来源。
- 修改 `src/components/AppShell.tsx`：桌面窄侧栏、顶栏操作、移动底部导航和账户区域。
- 创建 `src/components/AppShell.test.tsx`：验证四项导航、主题切换和退出行为不因重构丢失。
- 修改 `src/components/LoadingState.tsx`：紧凑加载、错误和重试状态的语义结构。
- 修改 `src/components/StatusBadge.tsx`：为紧凑状态标签提供稳定类名，不改变状态文字。
- 修改 `src/pages/TransactionsPage.tsx`：工具栏、摘要、导出入口、筛选区和批量操作的语义分组。
- 修改 `src/features/transactions/TransactionList.tsx`：桌面表格与移动账本列表的信息层级。
- 修改 `src/features/transactions/TransactionDrawer.tsx`：桌面抽屉和移动近全屏表单的结构钩子。
- 修改 `src/pages/OverviewPage.tsx`：五列经营摘要、移动利润优先层级和月度图表结构。
- 创建 `src/pages/OverviewPage.test.tsx`：验证真实指标、警告和月度数据渲染。
- 修改 `src/pages/AnalyticsPage.tsx`：趋势主区域、三组下钻账本和移动纵向布局。
- 修改 `src/pages/LoginPage.tsx`：登录错误状态、字段容器和加载反馈结构。
- 创建 `src/pages/LoginPage.test.tsx`：验证登录失败和进行中状态。
- 修改 `src/pages/SettingsPage.tsx`：只读状态账本和连接状态语义。
- 创建 `src/pages/SettingsPage.test.tsx`：验证账号、权限、连接和版本。
- 更新已有交易、抽屉、分析测试：只在语义结构变化时调整选择器并补充关键行为。

## 任务 1：建立应用壳与全局设计令牌

**文件：**
- 创建：`src/components/AppShell.test.tsx`
- 修改：`src/components/AppShell.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：编写失败的 AppShell 行为测试**

```tsx
it('renders exactly four primary destinations and triggers theme toggle', async () => {
  const onTheme = vi.fn();
  renderShell({ onTheme });
  expect(screen.getAllByRole('link')).toHaveLength(8); // 桌面与移动各四项
  expect(screen.getAllByRole('link', { name: '交易' })).toHaveLength(2);
  await userEvent.click(screen.getByRole('button', { name: '切换到深色模式' }));
  expect(onTheme).toHaveBeenCalledOnce();
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：`npm test -- src/components/AppShell.test.tsx`

预期：FAIL，因为测试辅助渲染器和新账户/导航语义尚未实现。

- [ ] **步骤 3：实现应用壳结构**

将导航保持为同一数据源，并给桌面和移动容器添加独立类名；顶栏保留主题、账号和退出，侧栏底部显示折叠提示与账户区域。所有图标继续来自 Lucide。

```tsx
<aside className="sidebar" aria-label="主导航">
  <div className="brand" aria-label="闲鱼损益">X</div>
  <nav className="sidebar-nav">{desktopLinks}</nav>
  <div className="sidebar-footer">{themeAndAccount}</div>
</aside>
<nav className="bottom-nav" aria-label="移动端主导航">{mobileLinks}</nav>
```

在 `src/styles.css` 顶部定义浅色/深色令牌、字号、间距、圆角、阴影和动效；桌面侧栏约 176px，移动端在 760px 以下切换为底部导航。

- [ ] **步骤 4：运行 AppShell 测试**

运行：`npm test -- src/components/AppShell.test.tsx`

预期：PASS，四项导航、主题与退出行为均可用。

- [ ] **步骤 5：提交应用壳**

```bash
git add src/components/AppShell.tsx src/components/AppShell.test.tsx src/styles.css
git commit -m "feat: 重构 Codex 风格应用壳"
```

## 任务 2：统一基础控件、状态与动效

**文件：**
- 修改：`src/components/LoadingState.tsx`
- 修改：`src/components/StatusBadge.tsx`
- 修改：`src/components/ConfirmDialog.tsx`
- 修改：`src/components/ConfirmDialog.test.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：补充确认弹窗状态测试**

```tsx
it('exposes the destructive action without adding an unsupported close control', () => {
  render(<ConfirmDialog open title="删除交易？" description="删除后无法恢复" confirmLabel="删除" onCancel={vi.fn()} onConfirm={vi.fn()} />);
  expect(screen.getByRole('alertdialog')).toHaveTextContent('删除后无法恢复');
  expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '关闭' })).not.toBeInTheDocument();
});
```

- [ ] **步骤 2：运行基础组件测试确认当前基线**

运行：`npm test -- src/components/ConfirmDialog.test.tsx`

预期：新增测试通过或暴露结构偏差；记录结果后再改样式。

- [ ] **步骤 3：实现基础视觉组件样式**

统一 `.button`、`.icon-button`、输入框、状态标签、提示条、加载/错误/空状态、确认弹窗；显式设置 12–14px 控件字体和 8–12px 圆角。新增页面/模块进入动画、行错峰变量、抽屉/弹窗过渡，并加入：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **步骤 4：运行组件测试**

运行：`npm test -- src/components/ConfirmDialog.test.tsx`

预期：PASS，焦点圈定、Escape、重复确认保护仍有效。

- [ ] **步骤 5：提交基础组件**

```bash
git add src/components/LoadingState.tsx src/components/StatusBadge.tsx src/components/ConfirmDialog.tsx src/components/ConfirmDialog.test.tsx src/styles.css
git commit -m "feat: 统一基础控件与界面动效"
```

## 任务 3：重构交易工作区

**文件：**
- 修改：`src/pages/TransactionsPage.tsx`
- 修改：`src/pages/TransactionsPage.test.tsx`
- 修改：`src/features/transactions/TransactionList.tsx`
- 修改：`src/features/transactions/TransactionList.test.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：为移动信息层级和批量操作编写失败测试**

```tsx
it('keeps the selected count and all supported batch actions available', async () => {
  renderPage();
  await screen.findByText('iPhone Air');
  await userEvent.click(screen.getAllByRole('checkbox')[1]);
  expect(screen.getByText('已选择 1 项')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '标记在售中' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '标记已售出' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument();
});
```

- [ ] **步骤 2：运行交易测试确认失败或记录当前结构差异**

运行：`npm test -- src/pages/TransactionsPage.test.tsx src/features/transactions/TransactionList.test.tsx`

预期：FAIL 于新的操作按钮名称或选中摘要结构。

- [ ] **步骤 3：实现桌面交易工作区**

标题区保留总记录数和本月利润；将搜索、状态、日期、更多筛选和导出统一为 `.transaction-commandbar`；表格使用黏性表头、稳定列宽、行悬停/选中态；分页和批量操作条独立但视觉连续。

- [ ] **步骤 4：实现移动交易账本**

在现有 `.mobile-list` 中按商品/状态、日期、成本、利润分组，不改变选择、编辑和分页事件。触控目标至少 44px，批量操作条固定在底部导航上方；筛选面板改为移动底部式区域但保持 DOM 与现有查询状态一致。

- [ ] **步骤 5：运行交易测试**

运行：`npm test -- src/pages/TransactionsPage.test.tsx src/features/transactions/TransactionList.test.tsx`

预期：PASS，搜索、排序、选择、分页和定位滚动保持有效。

- [ ] **步骤 6：提交交易工作区**

```bash
git add src/pages/TransactionsPage.tsx src/pages/TransactionsPage.test.tsx src/features/transactions/TransactionList.tsx src/features/transactions/TransactionList.test.tsx src/styles.css
git commit -m "feat: 优化交易工作区与移动账本"
```

## 任务 4：重构交易抽屉与移动表单

**文件：**
- 修改：`src/features/transactions/TransactionDrawer.tsx`
- 修改：`src/features/transactions/TransactionDrawer.test.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：补充字段完整性测试**

```tsx
it('shows only supported fields and read-only calculated cost', () => {
  renderDrawer();
  for (const label of ['商品名称', '状态', '售价', '购入成本', '运费', '购入日期', '售出日期', '备注']) {
    expect(screen.getByLabelText(label)).toBeInTheDocument();
  }
  expect(screen.getByText('总成本（飞书）')).toBeInTheDocument();
  expect(screen.queryByText(/0 \/ 200/)).not.toBeInTheDocument();
});
```

- [ ] **步骤 2：运行抽屉测试**

运行：`npm test -- src/features/transactions/TransactionDrawer.test.tsx`

预期：PASS 或暴露标签关联问题；若标签查询失败，先修正 `htmlFor/id`。

- [ ] **步骤 3：实现桌面和移动抽屉布局**

桌面宽度约 460px，表单滚动、页脚固定；移动端 760px 以下为近全屏底部表单，主要字段单列、日期可并排、底部操作区包含安全区。保持现有保存、删除、Escape、遮罩关闭和公式字段逻辑。

- [ ] **步骤 4：运行抽屉测试**

运行：`npm test -- src/features/transactions/TransactionDrawer.test.tsx`

预期：PASS，创建、编辑、校验、只读公式和删除均不回归。

- [ ] **步骤 5：提交抽屉**

```bash
git add src/features/transactions/TransactionDrawer.tsx src/features/transactions/TransactionDrawer.test.tsx src/styles.css
git commit -m "feat: 优化交易抽屉与移动表单"
```

## 任务 5：实现经营概览

**文件：**
- 创建：`src/pages/OverviewPage.test.tsx`
- 修改：`src/pages/OverviewPage.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：编写经营指标与警告测试**

```tsx
it('renders the five real summary metrics and incomplete-data warning', async () => {
  renderOverview(summaryFixture);
  for (const label of ['销售额', '总成本', '利润', 'ROI', '成交笔数']) {
    expect(await screen.findByText(label)).toBeInTheDocument();
  }
  expect(screen.getByRole('status')).toHaveTextContent('字段不完整');
  expect(screen.getByText('月度利润')).toBeInTheDocument();
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：`npm test -- src/pages/OverviewPage.test.tsx`

预期：FAIL，因为测试夹具、QueryClient 包装器和新的摘要语义尚未建立。

- [ ] **步骤 3：实现桌面与移动概览**

使用一个 `.overview-summary` 容器渲染五项指标，给利润添加显式强调类；移动端通过 CSS `order` 将利润放到首位，其余指标 2×2 排列。月度图表保留真实数据和正负柱，移动图表外层允许横向滚动并设置最小绘图区宽度。

- [ ] **步骤 4：运行概览测试**

运行：`npm test -- src/pages/OverviewPage.test.tsx`

预期：PASS，真实指标、警告、空图表状态均正确。

- [ ] **步骤 5：提交概览**

```bash
git add src/pages/OverviewPage.tsx src/pages/OverviewPage.test.tsx src/styles.css
git commit -m "feat: 重构经营概览数据层级"
```

## 任务 6：实现利润分析

**文件：**
- 修改：`src/pages/AnalyticsPage.tsx`
- 修改：`src/pages/AnalyticsPage.test.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：补充禁止虚构字段的测试**

```tsx
it('shows supported drilldown counts without invented aggregate columns', async () => {
  renderAnalytics();
  expect(await screen.findByText('高收益')).toBeInTheDocument();
  expect(screen.getByText('2 笔')).toBeInTheDocument();
  expect(screen.queryByText('占比')).not.toBeInTheDocument();
  expect(screen.queryByText('成交金额')).not.toBeInTheDocument();
});
```

- [ ] **步骤 2：运行分析测试**

运行：`npm test -- src/pages/AnalyticsPage.test.tsx`

预期：新增测试 PASS 或暴露生成稿之外的旧结构差异。

- [ ] **步骤 3：实现趋势与下钻布局**

保留利润单系列柱图、日期范围和现有 Link 下钻。桌面下方三列；移动纵向堆叠。图表容器提供最小宽度和横向滚动，Tooltip 使用主题变量；展开列表使用类名切换和 CSS 动画，不改变链接目标。

- [ ] **步骤 4：运行分析测试**

运行：`npm test -- src/pages/AnalyticsPage.test.tsx`

预期：PASS，日期筛选、展开、商品跳转和真实字段约束均有效。

- [ ] **步骤 5：提交分析**

```bash
git add src/pages/AnalyticsPage.tsx src/pages/AnalyticsPage.test.tsx src/styles.css
git commit -m "feat: 优化利润分析与移动下钻"
```

## 任务 7：实现登录与设置

**文件：**
- 创建：`src/pages/LoginPage.test.tsx`
- 创建：`src/pages/SettingsPage.test.tsx`
- 修改：`src/pages/LoginPage.tsx`
- 修改：`src/pages/SettingsPage.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：编写登录与设置测试**

```tsx
it('shows login API errors without adding unsupported account actions', async () => {
  mockLogin.mockRejectedValue(new Error('账号或密码错误'));
  renderLogin();
  await userEvent.type(screen.getByLabelText('账号'), 'x');
  await userEvent.type(screen.getByLabelText('密码'), 'bad');
  await userEvent.click(screen.getByRole('button', { name: '登录' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('账号或密码错误');
  expect(screen.queryByText('忘记密码')).not.toBeInTheDocument();
});

it('renders settings as a four-row read-only ledger', async () => {
  renderSettings();
  for (const label of ['当前账号', '账号权限', '飞书连接', '版本']) {
    expect(await screen.findByText(label)).toBeInTheDocument();
  }
  expect(screen.queryByRole('switch')).not.toBeInTheDocument();
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：`npm test -- src/pages/LoginPage.test.tsx src/pages/SettingsPage.test.tsx`

预期：FAIL，因为新测试包装器和语义结构尚未完成。

- [ ] **步骤 3：实现登录和设置结构**

登录页只保留产品标识、说明、两个字段、错误和提交按钮；设置页使用四行定义列表或语义等价结构，连接状态带文字和小圆点，安全提示保持现有文案。

- [ ] **步骤 4：运行登录与设置测试**

运行：`npm test -- src/pages/LoginPage.test.tsx src/pages/SettingsPage.test.tsx`

预期：PASS，登录错误/进行中、只读设置和健康状态均正确。

- [ ] **步骤 5：提交登录与设置**

```bash
git add src/pages/LoginPage.tsx src/pages/LoginPage.test.tsx src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx src/styles.css
git commit -m "feat: 优化登录与设置界面"
```

## 任务 8：整体验证、视觉对照与修正

**文件：**
- 修改：上述任一出现差异的源码或测试文件
- 临时：浏览器截图与差异记录，交付前删除

- [ ] **步骤 1：运行完整自动化检查**

运行：

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

预期：所有命令退出码 0；构建允许保留既有 chunk-size warning，但不得出现新错误。

- [ ] **步骤 2：启动本地完整应用并验证核心流程**

运行：`npm run dev:pages -- --port 8790`

使用 Browser/IAB 验证登录、交易搜索/筛选/排序/分页、选择/批量操作、抽屉保存、删除确认、导出、分析下钻、主题切换。

- [ ] **步骤 3：桌面视觉对照**

在接近 1584×990 的视口截图交易、概览、分析、设置、登录、抽屉和确认弹窗；使用 `view_image` 对照 `docs/superpowers/specs/assets/ui-refresh/*-desktop.png`。记录并修复至少以下五项：结构、排版、色彩、圆角/边框、图表/状态。

- [ ] **步骤 4：移动视觉对照**

在 390×844 视口验证交易、概览、分析、设置、登录和交易表单；检查横向溢出、44px 触控目标、底部安全区、图表滚动、表单键盘空间和批量操作条。

- [ ] **步骤 5：主题与动画验证**

验证浅色、深色和 `prefers-reduced-motion: reduce`。深色对照 `transactions-dark.png`；确认动画在减少动画模式中无明显位移或延迟。

- [ ] **步骤 6：删除临时 QA 文件并再次运行关键检查**

运行：

```bash
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```

预期：全部通过且工作树只包含计划内变更。

- [ ] **步骤 7：提交最终视觉修正**

```bash
git add src
git commit -m "fix: 对齐最终视觉与响应式细节"
```

