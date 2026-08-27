# 手机端侧边栏与经营视图重设计实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将手机端由七项底部导航改为覆盖式侧边栏，并使交易、概览、分析和状态管理页面在窄屏下符合已确认的经营优先布局。

**架构：** `AppShell` 新增仅在窄屏显示的移动应用栏与焦点受控侧边抽屉，复用同一份导航定义和既有路由。页面保持现有查询与突变逻辑，响应式 CSS 重新编排壳、交易工具栏、列表、指标和图表；必要时仅为可访问入口增加最小 JSX 标记。现有移动表单、下钻和抽屉逻辑继续使用。

**技术栈：** React 18、React Router、TanStack Query、TypeScript、Vitest、Testing Library、纯 CSS 自定义属性与媒体查询。

---

## 文件结构

- 修改：`src/components/AppShell.tsx` — 共享导航数据、移动顶部栏、可访问的覆盖式侧边抽屉、导航后的关闭行为。
- 修改：`src/components/AppShell.test.tsx` — 验证移动菜单、完整路由入口、菜单关闭、主题/语言/退出入口；移除对底部导航的断言。
- 修改：`src/pages/TransactionsPage.tsx` — 为移动端筛选触发器与收纳的工具动作提供语义化入口，保留现有查询和批量操作。
- 修改：`src/pages/TransactionsPage.test.tsx` — 验证移动筛选面板触发与现有操作仍可到达。
- 修改：`src/styles.css` — 建立覆盖式移动侧边栏、移动应用栏、无底栏内容间距、交易移动工具栏/筛选层、批量条与数据页排版。
- 修改：`src/pages/OverviewPage.tsx` — 只添加用于移动利润主视觉的稳定类名或语义区域，不改变指标数据。
- 修改：`src/pages/OverviewPage.test.tsx` — 验证利润主视觉容器和四项账本指标仍使用真实数据。
- 修改：`src/pages/AnalyticsPage.tsx` — 只添加稳定的移动结构类名，不改变月份、下钻和 API 查询。
- 修改：`src/pages/AnalyticsPage.test.tsx` — 验证分析区域、月份控制与下钻仍可用。

## 任务 1：为移动抽屉编写失败的壳测试

**文件：**
- 修改：`src/components/AppShell.test.tsx`

- [ ] **步骤 1：替换旧的底部导航断言，编写移动侧栏测试。**

```tsx
it('opens the mobile sidebar and exposes every desktop workspace', async () => {
  renderShell();
  const user = userEvent.setup();

  expect(screen.queryByRole('navigation', { name: '移动端主导航' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '打开导航菜单' }));

  const menu = screen.getByRole('dialog', { name: '主导航' });
  expect(within(menu).getAllByRole('link').map((link) => link.textContent)).toEqual([
    '交易', '在售中', '自用中', '概览', '分析', '设置',
  ]);
});

it('closes the mobile sidebar after navigation and keeps the logout action reachable', async () => {
  renderShell();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: '打开导航菜单' }));
  const menu = screen.getByRole('dialog', { name: '主导航' });
  expect(within(menu).getByRole('button', { name: '退出登录' })).toBeInTheDocument();
  await user.click(within(menu).getByRole('link', { name: '概览' }));
  expect(screen.queryByRole('dialog', { name: '主导航' })).not.toBeInTheDocument();
});
```

- [ ] **步骤 2：运行测试并确认因缺少菜单触发器失败。**

运行：`npm test -- src/components/AppShell.test.tsx`

预期：FAIL，提示找不到名称为“打开导航菜单”的按钮。

- [ ] **步骤 3：提交测试变更。**

```bash
git add src/components/AppShell.test.tsx
git commit -m "test: cover mobile sidebar navigation"
```

## 任务 2：实现移动应用栏与覆盖式侧边栏

**文件：**
- 修改：`src/components/AppShell.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：在 `AppShell.tsx` 增加路由标题和抽屉状态。**

```tsx
import { Menu, X } from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

const location = useLocation();
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
const currentNavigation = navigation.find((item) => item.to === location.pathname) ?? navigation[0];
const closeMobileMenu = () => setMobileMenuOpen(false);
```

- [ ] **步骤 2：在工作区前渲染移动应用栏与带语义的抽屉。**

```tsx
<header className="mobile-app-bar">
  <button className="icon-button" aria-label="打开导航菜单" onClick={() => setMobileMenuOpen(true)}>
    <Menu size={20} />
  </button>
  <span>{t(currentNavigation.labelKey)}</span>
</header>
{mobileMenuOpen && (
  <div className="mobile-sidebar-layer">
    <button className="mobile-sidebar-backdrop" aria-label="关闭导航菜单" onClick={closeMobileMenu} />
    <aside className="mobile-sidebar" role="dialog" aria-modal="true" aria-label={t('nav.main')}>
      <header><span className="brand">X</span><button className="icon-button" aria-label="关闭导航菜单" onClick={closeMobileMenu}><X size={20} /></button></header>
      <nav>{navigation.map(({ to, labelKey, icon: Icon }) => <NavLink key={to} to={to} onClick={closeMobileMenu}><Icon size={18}/><span>{t(labelKey)}</span></NavLink>)}</nav>
      <div className="mobile-sidebar-footer">{/* 主题、语言、退出复用既有动作 */}</div>
    </aside>
  </div>
)}
```

- [ ] **步骤 3：用 `useEffect` 在 Escape 时关闭菜单并在组件卸载时清理监听。**

```tsx
useEffect(() => {
  if (!mobileMenuOpen) return;
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') closeMobileMenu();
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, [mobileMenuOpen]);
```

- [ ] **步骤 4：在 `styles.css` 添加壳样式，并覆盖窄屏下旧底部栏。**

```css
.mobile-app-bar,
.mobile-sidebar-layer { display: none; }

@media (max-width: 680px) {
  .topbar, .bottom-nav { display: none; }
  .mobile-app-bar { display:flex; position:sticky; top:0; z-index:40; height:56px; align-items:center; gap:10px; padding:0 12px; background:var(--surface); border-bottom:1px solid var(--border); font-weight:700; }
  .mobile-sidebar-layer { display:block; position:fixed; inset:0; z-index:90; }
  .mobile-sidebar-backdrop { position:absolute; inset:0; width:100%; border:0; background:color-mix(in srgb, #000, transparent 58%); }
  .mobile-sidebar { position:relative; display:flex; width:min(84vw,340px); height:100%; flex-direction:column; padding:16px 12px calc(16px + env(safe-area-inset-bottom)); background:var(--surface); box-shadow:var(--shadow-float); animation:mobile-sidebar-in 220ms var(--ease-out-smooth); }
  .content { padding:18px 16px calc(28px + env(safe-area-inset-bottom)); }
}
```

- [ ] **步骤 5：运行壳测试确认通过。**

运行：`npm test -- src/components/AppShell.test.tsx`

预期：PASS。

- [ ] **步骤 6：提交导航实现。**

```bash
git add src/components/AppShell.tsx src/components/AppShell.test.tsx src/styles.css
git commit -m "feat: replace mobile tabs with sidebar navigation"
```

## 任务 3：为交易工具栏与移动筛选收纳编写失败测试

**文件：**
- 修改：`src/pages/TransactionsPage.test.tsx`
- 修改：`src/pages/TransactionsPage.tsx`

- [ ] **步骤 1：添加针对筛选触发器和面板的测试。**

```tsx
it('opens the mobile transaction filters without removing search or export actions', async () => {
  mockTransactions();
  const user = userEvent.setup();
  renderPage();
  await screen.findByText('交易明细');

  await user.click(screen.getByRole('button', { name: '打开筛选条件' }));
  expect(screen.getByRole('region', { name: '筛选交易' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '导出 Excel' })).toBeInTheDocument();
});
```

- [ ] **步骤 2：运行测试并确认因触发器不存在失败。**

运行：`npm test -- src/pages/TransactionsPage.test.tsx`

预期：FAIL，提示找不到“打开筛选条件”。

- [ ] **步骤 3：在 `TransactionsPage.tsx` 引入局部 `filtersOpen` 状态，并将状态、日期、重置条件置入命名筛选区域。**

```tsx
const [filtersOpen, setFiltersOpen] = useState(false);

<button className="icon-button mobile-filter-trigger" aria-label="打开筛选条件" onClick={() => setFiltersOpen(true)}>
  <SlidersHorizontal size={18} />
</button>
{filtersOpen && <section className="mobile-filter-sheet" role="region" aria-label="筛选交易">{/* 复用现有状态、日期和重置控件 */}</section>}
```

- [ ] **步骤 4：在 `styles.css` 保留桌面工具栏布局；窄屏将条件控件隐藏在 `mobile-filter-sheet` 中，搜索、移动筛选触发器、新增按钮、列设置与导出使用 44px 触控尺寸。**

```css
.mobile-filter-trigger, .mobile-filter-sheet { display:none; }
@media (max-width:680px) {
  .mobile-filter-trigger { display:inline-flex; flex:0 0 44px; width:44px; height:44px; }
  .mobile-filter-sheet { display:grid; position:fixed; inset:auto 0 0; z-index:80; gap:12px; padding:16px 16px calc(16px + env(safe-area-inset-bottom)); border-radius:16px 16px 0 0; background:var(--surface); box-shadow:0 -12px 38px rgba(16,24,40,.18); }
}
```

- [ ] **步骤 5：运行交易页测试确认通过。**

运行：`npm test -- src/pages/TransactionsPage.test.tsx`

预期：PASS。

- [ ] **步骤 6：提交交易工具栏实现。**

```bash
git add src/pages/TransactionsPage.tsx src/pages/TransactionsPage.test.tsx src/styles.css
git commit -m "feat: refine mobile transaction controls"
```

## 任务 4：调整概览与分析的手机数据层级

**文件：**
- 修改：`src/pages/OverviewPage.tsx`
- 修改：`src/pages/OverviewPage.test.tsx`
- 修改：`src/pages/AnalyticsPage.tsx`
- 修改：`src/pages/AnalyticsPage.test.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：为概览利润主视觉和分析手机结构添加失败断言。**

```tsx
expect(container.querySelector('.overview-profit-hero')).toHaveTextContent('¥21,764.14');
expect(container.querySelector('.page--analytics')).toHaveClass('page--analytics');
expect(screen.getByTestId('monthly-profit-scroll')).toBeInTheDocument();
```

- [ ] **步骤 2：运行页面测试并确认利润主视觉类名未出现。**

运行：`npm test -- src/pages/OverviewPage.test.tsx src/pages/AnalyticsPage.test.tsx`

预期：FAIL，仅概览测试提示 `.overview-profit-hero` 为空。

- [ ] **步骤 3：在 `OverviewPage.tsx` 为真实利润指标添加主视觉类名，而不改变 `metrics` 数组或数值格式。**

```tsx
<article key={key} className={`metric metric--${key}${key === 'profit' ? ' overview-profit-hero' : ''}`}>
```

- [ ] **步骤 4：在 `AnalyticsPage.tsx` 为月份控制、趋势面板和统计列表添加仅供布局使用的类名；保留现有 `AnalysisMonthControl`、`MonthlyProfitChart`、`DrilldownGroup` 和链接 URL。**

```tsx
<header className="page-header analytics-page-header">...</header>
<section className="panel panel--wide monthly-profit-panel analytics-trend-panel">...</section>
<section className="panel analytics-stat-card analytics-mobile-accordion">...</section>
```

- [ ] **步骤 5：在窄屏 CSS 中将概览利润置顶为全宽主视觉、四项指标置于后续 2×2 网格，保持图表滚动宽度；让分析月份控制整行显示，趋势和统计区纵向排列。**

```css
@media (max-width:680px) {
  .overview-profit-hero { grid-column:1 / -1; grid-row:1; padding-block:22px; }
  .overview-monthly-chart .simple-chart-wrapper,
  .monthly-profit-chart__scroll { overscroll-behavior-inline:contain; }
  .analytics-page-header { gap:10px; }
  .analytics-mobile-accordion { padding:14px 16px; }
}
```

- [ ] **步骤 6：运行概览和分析测试确认通过。**

运行：`npm test -- src/pages/OverviewPage.test.tsx src/pages/AnalyticsPage.test.tsx`

预期：PASS。

- [ ] **步骤 7：提交数据页布局实现。**

```bash
git add src/pages/OverviewPage.tsx src/pages/OverviewPage.test.tsx src/pages/AnalyticsPage.tsx src/pages/AnalyticsPage.test.tsx src/styles.css
git commit -m "feat: prioritize mobile operating insights"
```

## 任务 5：统一移动状态管理页、表单与端到端验证

**文件：**
- 修改：`src/styles.css`
- 测试：`src/pages/SelfUsePage.test.tsx`
- 测试：`src/features/transactions/TransactionDrawer.test.tsx`
- 测试：`src/styles.test.ts`

- [ ] **步骤 1：为自用中、在售中与交易表单的 44px 可用操作添加现有类名断言。**

```tsx
expect(screen.getByRole('button', { name: '添加' })).toBeInTheDocument();
expect(screen.getByRole('button', { name: '保存交易' })).toBeInTheDocument();
```

- [ ] **步骤 2：运行相关测试，确认既有行为在修改前仍绿灯。**

运行：`npm test -- src/pages/SelfUsePage.test.tsx src/features/transactions/TransactionDrawer.test.tsx src/styles.test.ts`

预期：PASS。

- [ ] **步骤 3：在移动媒体查询中清除自用中窗口的桌面浮层感，保留搜索、排序、添加、标记在售和确认售出；确保交易抽屉近全屏、固定底部操作区和 `env(safe-area-inset-bottom)` 保持可用。**

```css
@media (max-width:680px) {
  .self-use-window { border-width:1px 0; border-radius:0; box-shadow:none; }
  .self-use-toolbar { min-height:44px; padding:0 0 12px; }
  .drawer { max-height:96dvh; }
  .drawer footer { padding-bottom:calc(14px + env(safe-area-inset-bottom)); }
}
```

- [ ] **步骤 4：运行所有相关组件测试。**

运行：`npm test -- src/components/AppShell.test.tsx src/pages/TransactionsPage.test.tsx src/pages/OverviewPage.test.tsx src/pages/AnalyticsPage.test.tsx src/pages/SelfUsePage.test.tsx src/features/transactions/TransactionDrawer.test.tsx src/styles.test.ts`

预期：PASS。

- [ ] **步骤 5：运行完整质量检查。**

运行：`npm run typecheck && npm run lint && npm test && npm run build`

预期：所有命令退出码为 0。

- [ ] **步骤 6：用 390×844 与 360×800 浏览器视口检查浅色、深色和减少动画下的交易、概览、分析、自用中、在售中、设置、筛选、编辑与导航抽屉；截图用于确认无底栏遮挡。**

- [ ] **步骤 7：提交最终样式与验证变更。**

```bash
git add src/styles.css src/pages/SelfUsePage.test.tsx src/features/transactions/TransactionDrawer.test.tsx src/styles.test.ts
git commit -m "style: complete mobile sidebar redesign"
```

## 计划自检

- 规格覆盖：任务 2 覆盖移动壳、完整导航、主题/语言/退出和无底栏间距；任务 3 覆盖交易搜索、筛选、导出、列设置与批量操作入口；任务 4 覆盖概览/分析真实数据、月份和下钻；任务 5 覆盖自用中、在售中、表单、可访问尺寸及完整验证。
- 占位符：计划没有开放需求；代码片段中的注释只指向同一任务内已经存在的现有操作，未引入未定义的领域 API。
- 类型一致性：`mobileMenuOpen`、`filtersOpen`、`overview-profit-hero` 与 `analytics-mobile-accordion` 在创建、样式和测试步骤中保持相同名称。
