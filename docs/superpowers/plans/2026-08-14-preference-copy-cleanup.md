# 字段按钮命名与缩减动画偏好清理实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将交易页字段入口命名为“自定义字段显示”，并完整移除手动缩减界面动画偏好，同时继续尊重系统级减少动态效果设置。

**架构：** 字段按钮仅调整可见文案，保留既有无障碍名称和移动端图标化响应规则。缩减动画从设置页、React 偏好上下文和持久化模型中删除；读取旧数据时忽略多余字段，CSS 仅保留系统媒体查询。

**技术栈：** React 18、TypeScript、Vitest、Testing Library、CSS、localStorage

---

### 任务 1：锁定新文案和设置页行为

**文件：**

- 修改：`src/features/transactions/ColumnVisibilityPanel.test.tsx`
- 修改：`src/pages/SettingsPage.test.tsx`

- [ ] **步骤 1：编写失败的测试**

在字段面板测试中断言触发按钮包含可见文本“自定义字段显示”；在设置页测试中断言不存在“缩减界面动画”复选框，同时主题切换仍正常工作。

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- src/features/transactions/ColumnVisibilityPanel.test.tsx src/pages/SettingsPage.test.tsx`

预期：字段按钮仍显示“列”，设置页仍存在缩减动画开关，因此新增断言失败。

- [ ] **步骤 3：实现最少界面修改**

将 `ColumnVisibilityPanel` 的可见按钮文字替换为“自定义字段显示”；从 `SettingsPage` 移除 `reduceMotion`、`setReduceMotion` 的解构与对应设置项。保留按钮现有 `aria-label="选择显示字段"`，确保手机图标模式仍有完整可访问名称。

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test -- src/features/transactions/ColumnVisibilityPanel.test.tsx src/pages/SettingsPage.test.tsx`

预期：两个测试文件全部通过。

### 任务 2：移除手动缩减动画偏好数据流

**文件：**

- 修改：`src/preferences/browser-preferences.test.ts`
- 修改：`src/preferences/BrowserPreferencesContext.test.tsx`
- 修改：`src/preferences/browser-preferences.ts`
- 修改：`src/preferences/BrowserPreferencesContext.tsx`
- 修改：`src/pages/TransactionsPage.test.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：编写失败的测试**

更新存储测试，要求默认对象不含 `reduceMotion`，并验证旧 `reduce-motion=true` 不进入读取结果；更新 Provider 测试，验证挂载后不会因旧数据向根节点添加 `reduce-motion` class。

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- src/preferences/browser-preferences.test.ts src/preferences/BrowserPreferencesContext.test.tsx`

预期：读取结果仍含 `reduceMotion` 或 Provider 仍应用根节点 class，测试失败。

- [ ] **步骤 3：实现最少数据流修改**

从 `BrowserPreferencesV1`、默认值、读取结果和 Context API 删除 `reduceMotion` / `setReduceMotion`；不再读取旧 `reduce-motion` 键，不再切换根节点 class。删除仅服务手动 class 的 CSS 规则，保留 `@media (prefers-reduced-motion: reduce)`。清理交易页测试夹具中的遗留字段。

- [ ] **步骤 4：运行定向测试验证通过**

运行：`npm test -- src/preferences/browser-preferences.test.ts src/preferences/BrowserPreferencesContext.test.tsx src/pages/TransactionsPage.test.tsx`

预期：三个测试文件全部通过。

### 任务 3：验证响应式与全量回归

**文件：**

- 验证：`src/features/transactions/ColumnVisibilityPanel.tsx`
- 验证：`src/styles.css`

- [ ] **步骤 1：运行静态与全量验证**

运行：`npm run format && npm run typecheck && npm run lint && npm test && npm run build`

预期：所有命令退出码为 0。

- [ ] **步骤 2：浏览器验收**

在 `http://localhost:8788/transactions` 验证桌面端显示“自定义字段显示”，320px 与 680px 下按钮保持图标化且无横向溢出；在 `/settings` 验证缩减动画开关消失、主题三态仍可操作。

- [ ] **步骤 3：提交修改**

```bash
git add docs/superpowers/specs/2026-08-13-browser-preferences-design.md docs/superpowers/plans/2026-08-14-preference-copy-cleanup.md src
git commit -m "refactor: 精简浏览器界面偏好"
```
