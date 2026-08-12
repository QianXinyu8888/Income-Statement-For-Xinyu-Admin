# 分析卡片样式优化实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将分析页三张统计卡片升级为统一的分层容器样式，并为展开产品增加序号与跳转提示。

**架构：** `AnalyticsPage` 只增加目标卡片、标题、展开态和产品行所需的语义类名与装饰元素；`styles.css` 完成外层卡片、内嵌展开面板、产品行及响应式视觉。数据接口、展开状态和订单跳转地址保持不变。

**技术栈：** React 18、React Router、Lucide React、CSS、Vitest、Testing Library。

---

## 文件结构

- 修改 `src/pages/AnalyticsPage.test.tsx`：验证三张卡片结构、产品序号及链接回归。
- 修改 `src/pages/AnalyticsPage.tsx`：增加分析卡片专用结构类名、标题色条、序号和跳转图标。
- 修改 `src/styles.css`：实现分层卡片、展开面板、产品行、暗色变量复用和移动端细节。

### 任务 1：增加卡片与产品行结构

**文件：**

- 修改：`src/pages/AnalyticsPage.test.tsx`
- 修改：`src/pages/AnalyticsPage.tsx`

- [ ] **步骤 1：编写失败的组件测试**

在现有分析页测试摘要中保留两条高收益产品。展开后验证：

```ts
expect(container.querySelectorAll('.analytics-stat-card')).toHaveLength(3);
expect(container.querySelectorAll('.analytics-stat-card__title-mark')).toHaveLength(3);
expect(screen.getByText('1', { selector: '.drilldown-product__index' })).toHaveAttribute(
  'aria-hidden',
  'true',
);
expect(screen.getByRole('link', { name: '高收益产品' })).toHaveAttribute(
  'href',
  '/transactions?focus=record%2F1',
);
```

并断言展开分组增加 `.drilldown-group--expanded`，产品链接增加 `.drilldown-product`。

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- src/pages/AnalyticsPage.test.tsx`

预期：FAIL，专用卡片、展开态和产品行类名尚不存在。

- [ ] **步骤 3：实现最少结构变更**

为利润区间、状态分布和退货摘要的 `<section>` 添加 `panel analytics-stat-card`。标题改为：

```tsx
<header className="analytics-stat-card__header">
  <span className="analytics-stat-card__title-mark" aria-hidden="true" />
  <h2>利润区间</h2>
</header>
```

`DrilldownGroup` 根元素按 `expanded` 增加 `drilldown-group--expanded`。产品索引改为：

```tsx
<Link className="drilldown-product" to={target}>
  <span className="drilldown-product__index" aria-hidden="true">
    {index + 1}
  </span>
  <span className="drilldown-product__title">{title}</span>
  <ChevronRight className="drilldown-product__arrow" aria-hidden="true" />
</Link>
```

- [ ] **步骤 4：运行组件测试确认通过**

运行：`npm test -- src/pages/AnalyticsPage.test.tsx`

预期：全部分析页测试 PASS，展开、收起、禁用和链接行为无回归。

- [ ] **步骤 5：提交结构变更**

```bash
git add src/pages/AnalyticsPage.tsx src/pages/AnalyticsPage.test.tsx
git commit -m "feat: 增强分析卡片产品结构"
```

### 任务 2：实现分层卡片视觉并完整验证

**文件：**

- 修改：`src/styles.css`

- [ ] **步骤 1：实现外层卡片和标题样式**

`.analytics-stat-card` 使用 `14px` 圆角、柔和阴影和 `18px` 内边距；标题头部使用横向布局，`.analytics-stat-card__title-mark` 为 `7px × 20px` 的圆角色条，颜色使用 `var(--accent)`。

- [ ] **步骤 2：实现展开分组样式**

`.drilldown-group--expanded` 使用 `1px` 边框、`12px` 圆角和隐藏溢出；展开按钮使用 `var(--accent-soft)` 背景，产品区恢复 `var(--surface)`，移除旧左侧竖线。未展开分组继续使用底部分隔线。

- [ ] **步骤 3：实现产品行与响应式样式**

`.drilldown-product` 使用三列网格：固定序号、可收缩标题、固定箭头。序号为 `23px` 圆角方块，产品标题单行省略；悬停使用 `var(--accent-soft)`。在 `max-width: 680px` 下减小卡片和产品区内边距，不改变触控高度。

- [ ] **步骤 4：运行完整验证**

运行：

```bash
npm test && npm run typecheck && npm run lint && npm run format && npm run build
```

预期：全部测试通过，类型检查、lint、格式检查和生产构建退出码均为 0。

- [ ] **步骤 5：提交样式变更**

```bash
git add src/styles.css
git commit -m "style: 优化分析统计卡片层级"
```

- [ ] **步骤 6：检查变更边界**

运行：`git status --short && git diff --check && git log -5 --oneline`

预期：工作区干净，无空白错误，最近提交仅覆盖本次卡片样式规格、计划与实现。
