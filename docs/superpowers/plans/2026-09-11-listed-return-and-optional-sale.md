# 在售回退与可选售出信息实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 支持在售物品直接切回自用中，并允许标记售出时所有补充信息为空。

**架构：** `SelfUsePage` 将目标状态传给 `SelfUseList`，由共享操作组件依据当前页面渲染互斥的状态按钮。售出表单将售价和售出日期作为可空值交给领域层，领域层把空输入规范化为 `null`，再通过既有更新接口提交。

**技术栈：** React、TypeScript、Vitest、Testing Library、Zod。

---

### 任务 1：支持在售中切回自用中

**文件：**
- 修改：`src/features/self-use/SelfUseList.tsx`
- 修改：`src/features/self-use/SelfUseList.test.tsx`
- 修改：`src/pages/SelfUsePage.tsx`
- 修改：`src/pages/SelfUsePage.test.tsx`

- [ ] **步骤 1：编写失败的操作测试**

添加断言：以“在售中”模式渲染时显示“设置 耳机 为自用中”按钮而不显示“设置 耳机 为在售中”；点击该按钮调用传入的状态更新回调与 `'自用中'`。页面级测试断言点击“设置 键盘 为自用中”调用 `batchStatus([listed.id], '自用中')`。

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- src/features/self-use/SelfUseList.test.tsx src/pages/SelfUsePage.test.tsx`

预期：FAIL；当前在售中页面没有“自用中”按钮，且页面状态更新函数固定写入“在售中”。

- [ ] **步骤 3：实现最少状态参数化代码**

将共享操作组件的单个状态回调参数扩展为目标状态；以当前页面状态确定目标：

```tsx
const alternateStatus = status === '自用中' ? '在售中' : '自用中';

<SelfUseList
  alternateStatus={alternateStatus}
  onChangeStatus={(record, nextStatus) => changeStatus.mutate({ record, nextStatus })}
/>
```

组件按钮使用 `aria-label={\`设置 ${title} 为${alternateStatus}\`}`，按钮文字为 `alternateStatus`。状态更新 mutation 传入 `nextStatus` 并据此调用 `apiClient.batchStatus`。

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test -- src/features/self-use/SelfUseList.test.tsx src/pages/SelfUsePage.test.tsx`

预期：PASS；自用中→在售中与在售中→自用中均调用正确接口，售出按钮仍打开确认窗口。

### 任务 2：允许空售出信息确认

**文件：**
- 修改：`src/domain/self-use.ts`
- 修改：`src/domain/self-use.test.ts`
- 修改：`src/features/self-use/SaleConfirmDialog.tsx`
- 修改：`src/features/self-use/SaleConfirmDialog.test.tsx`
- 修改：`src/pages/SelfUsePage.test.tsx`

- [ ] **步骤 1：编写失败的领域与窗口测试**

添加以下行为：

```tsx
expect(createSaleInput(personal, { salePrice: null, soldDate: null, note: '' })).toMatchObject({
  status: '已售出', salePrice: null, soldDate: null, note: null,
});
```

并添加窗口测试：空价格、空日期、空备注时点击“确认售出”调用 `onConfirm({ salePrice: null, soldDate: null, note: '' })`，不显示错误；非空负价格继续显示“请输入有效售价”。

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- src/domain/self-use.test.ts src/features/self-use/SaleConfirmDialog.test.tsx`

预期：FAIL；现有 `SaleValues` 不允许空值，窗口要求售价且预填当天日期。

- [ ] **步骤 3：实现空值规范化**

```ts
export interface SaleValues {
  salePrice: number | null;
  soldDate: string | null;
  note: string;
}

salePrice: values.salePrice,
soldDate: values.soldDate,
note: values.note.trim() || null,
```

窗口初始化 `soldDate` 为 `''`；提交时空价格转换为 `null`，空日期转换为 `null`，仅在提供价格时校验有限且不小于零。移除两个必填星号和空值报错。

- [ ] **步骤 4：运行相关与全量测试**

运行：`npm test -- src/domain/self-use.test.ts src/features/self-use/SaleConfirmDialog.test.tsx src/pages/SelfUsePage.test.tsx && npm test -- --run && npm run build`

预期：PASS；空信息与完整信息售出均正确，171 项以上全量测试与构建通过。

- [ ] **步骤 5：提交实现与计划**

```bash
git add src/domain/self-use.ts src/domain/self-use.test.ts src/features/self-use/SaleConfirmDialog.tsx src/features/self-use/SaleConfirmDialog.test.tsx src/features/self-use/SelfUseList.tsx src/features/self-use/SelfUseList.test.tsx src/pages/SelfUsePage.tsx src/pages/SelfUsePage.test.tsx docs/superpowers/plans/2026-09-11-listed-return-and-optional-sale.md
git commit -m "feat(产品状态): 支持回退与空售出信息"
```
