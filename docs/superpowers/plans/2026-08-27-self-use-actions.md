# 自用产品操作区实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将自用产品操作区改为完整文案的主次按钮，突出“确认售出”。

**架构：** 保留 `SelfUseActions` 中的两个独立按钮和既有回调，只改可见文案及 CSS 层级。自用页显示轻量“标记在售”和蓝色主按钮“确认售出”；在售页只显示蓝色主按钮。

**技术栈：** React、TypeScript、Vitest、Testing Library、CSS。

---

## 文件结构

- 修改：`src/features/self-use/SelfUseList.tsx` — 更新两个操作的可见文案与样式修饰类。
- 修改：`src/features/self-use/SelfUseList.test.tsx` — 断言完整文案与保留的辅助功能名称。
- 修改：`src/styles.css` — 将次操作变为轻量文本按钮，将售出操作变为蓝色实心主按钮。

### 任务 1：定义完整操作文案

**文件：**

- 修改：`src/features/self-use/SelfUseList.test.tsx:42-86`
- 修改：`src/features/self-use/SelfUseList.tsx:29-51`

- [x] **步骤 1：编写失败的测试**

```tsx
expect(screen.getAllByText('标记在售')).toHaveLength(2);
expect(screen.getAllByText('确认售出')).toHaveLength(2);
expect(screen.queryByText('售出…')).not.toBeInTheDocument();
```

- [x] **步骤 2：运行测试验证失败**

运行：`npm test -- --run src/features/self-use/SelfUseList.test.tsx`

预期：FAIL，现有按钮文本为“在售中”和“售出…”。

- [x] **步骤 3：编写最少实现代码**

```tsx
<span>标记在售</span>
<span>确认售出</span>
```

- [x] **步骤 4：运行测试验证通过**

运行：`npm test -- --run src/features/self-use/SelfUseList.test.tsx`

预期：PASS。

### 任务 2：实现主次操作样式

**文件：**

- 修改：`src/styles.css:3677-3722`

- [x] **步骤 1：应用主次按钮规则**

```css
.self-use-action--listed { border-color: transparent; background: transparent; }
.self-use-action--sale { border-color: #0071e3; background: #0071e3; color: #fff; }
```

- [x] **步骤 2：执行完整验证**

运行：`npm run lint && npm run typecheck && npm test -- --run && npm run build`

预期：所有检查通过。

- [x] **步骤 3：Commit**

```bash
git add src/features/self-use/SelfUseList.tsx src/features/self-use/SelfUseList.test.tsx src/styles.css
git commit -m "style: 重设自用产品操作区"
```
