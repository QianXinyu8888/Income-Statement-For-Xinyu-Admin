# 售出确认窗口微调实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 让售出确认窗口的价格输入和自用天数提示更符合 macOS 表单样式与中文阅读习惯。

**架构：** 保持 `SaleConfirmDialog` 的数据流不变，只修改其展示文案；通过局部 CSS 将货币符号和数字输入组成单一的可聚焦控件。组件测试覆盖新的提示文本，避免空格回归。

**技术栈：** React、TypeScript、Vitest、Testing Library、CSS。

---

## 文件结构

- 修改：`src/features/self-use/SaleConfirmDialog.tsx` — 输出没有名称两侧空格的自用天数提示。
- 修改：`src/features/self-use/SaleConfirmDialog.test.tsx` — 断言紧凑中文提示文案。
- 修改：`src/styles.css` — 定义价格前缀与输入内容的间距、单层焦点环。

### 任务 1：更新售出提示文案

**文件：**

- 修改：`src/features/self-use/SaleConfirmDialog.test.tsx:40-43`
- 修改：`src/features/self-use/SaleConfirmDialog.tsx:138-140`

- [x] **步骤 1：编写失败的测试**

```tsx
expect(
  screen.getByText(`今天是你自用AirPods Pro的第 ${getUsageDayNumber(record.purchaseDate)} 天`),
).toBeInTheDocument();
```

- [x] **步骤 2：运行测试验证失败**

运行：`npm test -- --run src/features/self-use/SaleConfirmDialog.test.tsx`

预期：FAIL，提示现有内容包含“自用 AirPods Pro 的第”。

- [x] **步骤 3：编写最少实现代码**

```tsx
<p>
  今天是你自用{record.title ?? '该物品'}的第 {usageDayNumber ?? '—'} 天
</p>
```

- [x] **步骤 4：运行测试验证通过**

运行：`npm test -- --run src/features/self-use/SaleConfirmDialog.test.tsx`

预期：PASS。

### 任务 2：统一价格输入焦点样式

**文件：**

- 修改：`src/styles.css:3795-3816`

- [x] **步骤 1：调整价格控件布局与焦点规则**

```css
.sale-dialog__money-input {
  gap: 8px;
  padding: 0 10px;
}

.sale-dialog__money-input input:focus {
  outline: 0;
}
```

- [x] **步骤 2：运行相关测试**

运行：`npm test -- --run src/features/self-use/SaleConfirmDialog.test.tsx`

预期：PASS。

- [x] **步骤 3：执行完整验证**

运行：`npm run lint && npm run typecheck && npm test -- --run && npm run build`

预期：所有检查通过。

- [x] **步骤 4：Commit**

```bash
git add src/features/self-use/SaleConfirmDialog.tsx src/features/self-use/SaleConfirmDialog.test.tsx src/styles.css
git commit -m "style: 优化售出确认窗口"
```
