# 产品状态直接操作实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在自用中和在售中列表中以直接按钮取代状态下拉菜单，同时复用既有的状态更新和售出确认流程。

**架构：** `SelfUseActions` 依据 `showListedAction` 渲染一组语义按钮。在自用中，`在售中` 调用既有单项状态更新；在售中仅显示 `已售出`，其点击仍由既有页面状态打开售出确认窗口。样式复用现有产品状态操作区域，并让移动端按钮自动换行。

**技术栈：** React、TypeScript、Vitest、Testing Library、CSS。

---

### 任务 1：覆盖直接状态按钮的交互

**文件：**
- 修改：`src/features/self-use/SelfUseList.test.tsx`
- 修改：`src/features/self-use/SelfUseList.tsx`

- [ ] **步骤 1：编写失败的测试**

将“使用状态菜单”的测试替换为以下两个行为断言：

```tsx
it('shows direct listed and sale actions for self-use records', async () => {
  const user = userEvent.setup();
  const { onMarkListed, onSell } = renderList();

  const listedButtons = screen.getAllByRole('button', { name: '设置 耳机 为在售中' });
  const saleButtons = screen.getAllByRole('button', { name: '设置 耳机 为已售出' });
  expect(screen.getAllByText('设为')).toHaveLength(2);

  await user.click(listedButtons[0]);
  await user.click(saleButtons[1]);
  expect(onMarkListed).toHaveBeenCalledWith(record);
  expect(onSell).toHaveBeenCalledWith(record);
});

it('shows only the direct sale action in the listed workspace', () => {
  renderList(false);

  expect(screen.queryByRole('button', { name: '设置 耳机 为在售中' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: '设置 耳机 为已售出' })).toHaveLength(2);
  expect(screen.queryByRole('combobox', { name: '设置 耳机 的状态' })).not.toBeInTheDocument();
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- src/features/self-use/SelfUseList.test.tsx`

预期：FAIL；现有组件只输出 `combobox`，没有“设置 耳机 为在售中 / 已售出”的按钮。

- [ ] **步骤 3：编写最少实现代码**

在 `SelfUseActions` 中以 `span.self-use-action-label` 和以下按钮取代 `select.self-use-status-select`：

```tsx
<span className="self-use-action-label">设为</span>
{showListedAction && (
  <button
    type="button"
    className="self-use-action self-use-action--listed"
    aria-label={`设置 ${title} 为在售中`}
    onClick={() => onMarkListed(record)}
    disabled={pending}
  >
    在售中
  </button>
)}
<button
  type="button"
  className="self-use-action self-use-action--sale"
  aria-label={`设置 ${title} 为已售出`}
  onClick={() => onSell(record)}
  disabled={pending}
>
  已售出
</button>
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test -- src/features/self-use/SelfUseList.test.tsx`

预期：PASS；直接按钮调用正确回调，在售中视图没有“在售中”按钮或下拉菜单。

### 任务 2：恢复直接按钮样式并验证全量测试

**文件：**
- 修改：`src/styles.css`
- 测试：`src/features/self-use/SelfUseList.test.tsx`

- [ ] **步骤 1：编写最少样式代码**

将 `self-use-status-select` 规则替换为：

```css
.self-use-actions { display: flex; align-items: center; gap: 4px; white-space: nowrap; }
.self-use-action-label { margin-right: 2px; color: var(--muted); font-size: 12px; font-weight: 500; }
.self-use-action { min-height: 29px; border: 1px solid #0071e3; border-radius: 6px; padding: 0 9px; background: #0071e3; color: #fff; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.self-use-action:disabled { cursor: default; opacity: 0.48; }
```

在窄屏媒体规则中保留 `.self-use-actions { gap: 9px; flex-wrap: wrap; }`，使按钮不会溢出。

- [ ] **步骤 2：运行相关与全量测试**

运行：`npm test -- src/features/self-use/SelfUseList.test.tsx src/pages/SelfUsePage.test.tsx && npm test -- --run`

预期：PASS；组件、页面和全量测试均通过。

- [ ] **步骤 3：提交实现**

运行：

```bash
git add src/features/self-use/SelfUseList.tsx src/features/self-use/SelfUseList.test.tsx src/styles.css docs/superpowers/plans/2026-09-09-product-status-direct-actions.md
git commit -m "feat(产品状态): 改用直接状态按钮"
```

预期：仅提交本任务的组件、测试、样式和实现计划。

### 任务 3：更新页面级直接操作回归测试

**文件：**
- 修改：`src/pages/SelfUsePage.test.tsx`

- [ ] **步骤 1：确认旧控件断言失败的根因**

运行：`npm test -- src/pages/SelfUsePage.test.tsx`

预期：FAIL；四个页面测试查找已删除的 `combobox`（名称为“设置 耳机 的状态”），而当前 DOM 已提供“设置 耳机 为在售中”和“设置 耳机 为已售出”按钮。

- [ ] **步骤 2：替换测试中的用户操作**

将三个 `selectOptions(..., 'listed')` 调用替换为：

```tsx
await user.click((await screen.findAllByRole('button', { name: '设置 耳机 为在售中' }))[0]);
```

将售出测试中的 `selectOptions(..., 'sold')` 调用替换为：

```tsx
await user.click((await screen.findAllByRole('button', { name: '设置 耳机 为已售出' }))[0]);
```

- [ ] **步骤 3：验证页面与全量测试**

运行：`npm test -- src/pages/SelfUsePage.test.tsx && npm test -- --run`

预期：PASS；页面测试仍覆盖在售状态更新、失败提示、网络错误和确认售出，全量测试通过。

- [ ] **步骤 4：提交测试修复与实现计划**

运行：

```bash
git add src/pages/SelfUsePage.test.tsx docs/superpowers/plans/2026-09-09-product-status-direct-actions.md
git commit -m "test(自用): 更新直接状态操作断言"
```

预期：仅提交页面测试与实现计划。

### 任务 4：覆盖在售中页面的完整售出确认链路

**文件：**
- 修改：`src/pages/SelfUsePage.test.tsx`

- [ ] **步骤 1：添加在售记录的售出集成测试**

添加一个 `renderPage('在售中')` 测试：点击“设置 键盘 为已售出”，填写售价 `1500`、售出日期 `2026-06-21` 和备注“顺丰到付”，确认后断言 `apiClient.updateTransaction` 的记录 ID 为 `listed.id`，输入含 `status: '已售出'`、`salePrice: 1500`、`soldDate: '2026-06-21'`、`note: '顺丰到付'`。

- [ ] **步骤 2：运行新增集成测试与全量测试**

运行：`npm test -- src/pages/SelfUsePage.test.tsx && npm test -- --run`

预期：PASS；在售页面加载、直接售出按钮、售出确认窗口和 API 提交均受页面级回归保护，全量测试通过。

- [ ] **步骤 3：提交回归测试**

运行：

```bash
git add src/pages/SelfUsePage.test.tsx docs/superpowers/plans/2026-09-09-product-status-direct-actions.md
git commit -m "test(在售): 覆盖直接售出流程"
```

预期：只提交新增的在售售出流程测试和计划。
