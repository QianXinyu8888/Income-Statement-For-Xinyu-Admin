# 统一加载 GIF 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 让项目中的所有独立加载画面统一展示用户提供的 GIF，并保留原有加载文案和无障碍语义。

**架构：** 继续以 `LoadingState` 作为唯一独立加载画面入口，将 GIF 作为 Vite `public/` 静态资源由组件引用。页面和路由无需分别修改，现有调用会自动获得统一视觉效果。

**技术栈：** React 18、TypeScript、Vite、Vitest、Testing Library、CSS

---

### 任务 1：锁定统一加载组件行为

**文件：**
- 创建：`src/components/LoadingState.test.tsx`
- 修改：`src/components/LoadingState.tsx`
- 修改：`src/styles.css`
- 创建：`public/loading.gif`

- [ ] **步骤 1：编写失败的测试**

```tsx
it('uses the shared gif for the default loading state', () => {
  render(<LoadingState />);
  expect(screen.getByRole('status')).toHaveTextContent('正在加载');
  expect(screen.getByRole('img', { name: '加载中' })).toHaveAttribute('src', '/loading.gif');
});

it('keeps a custom loading label', () => {
  render(<LoadingState label="正在加载交易" />);
  expect(screen.getByRole('status')).toHaveTextContent('正在加载交易');
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- src/components/LoadingState.test.tsx`

预期：FAIL，因为当前组件仍渲染无图片语义的 `.spinner`。

- [ ] **步骤 3：复制资源并完成最少实现**

将 `/Users/xinyu/Desktop/icons8-加载.gif` 原样复制到 `public/loading.gif`，并将组件视觉元素改为：

```tsx
<img className="loading-gif" src="/loading.gif" alt="加载中" />
```

将 `.spinner` 样式替换为固定尺寸的 `.loading-gif` 样式，并移除 `@keyframes spin`。

- [ ] **步骤 4：运行目标测试验证通过**

运行：`npm test -- src/components/LoadingState.test.tsx`

预期：2 个测试全部 PASS。

- [ ] **步骤 5：提交实现**

```bash
git add public/loading.gif src/components/LoadingState.tsx src/components/LoadingState.test.tsx src/styles.css
git commit -m "feat(加载状态): 统一使用 GIF 加载画面"
```

### 任务 2：验证项目并发布

**文件：**
- 验证：`src/App.tsx`
- 验证：`src/pages/OverviewPage.tsx`
- 验证：`src/pages/AnalyticsPage.tsx`
- 验证：`src/pages/TransactionsPage.tsx`

- [ ] **步骤 1：检索独立加载入口**

运行：`rg -n "LoadingState|spinner|isLoading" src --glob '!*.test.*'`

预期：所有独立加载画面继续通过 `LoadingState` 渲染，且生产代码中不再使用 `.spinner`。

- [ ] **步骤 2：运行完整质量检查**

运行：`npm test && npm run typecheck && npm run lint && npm run build`

预期：所有命令退出码均为 0。

- [ ] **步骤 3：核对资源一致性**

运行：`shasum -a 256 /Users/xinyu/Desktop/icons8-加载.gif public/loading.gif`

预期：两个文件的 SHA-256 完全相同。

- [ ] **步骤 4：推送到 GitHub**

运行：`git push origin HEAD:main`

预期：GitHub `origin/main` 更新到当前已验证提交。
