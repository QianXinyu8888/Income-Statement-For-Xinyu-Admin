# 交易字段点击定位实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 让交易列表中的可编辑字段打开编辑抽屉并自动聚焦对应表单控件。

**架构：** 使用共享的 `EditableTransactionField` 联合类型连接列表、页面和抽屉。列表发出记录与字段键，页面保存目标，抽屉通过 ref 映射执行延迟聚焦；现有抽屉状态与保存流程不变。

**技术栈：** React 18、TypeScript、Testing Library、Vitest、CSS

---

### 任务 1：列表字段入口

**文件：**

- 修改：`src/features/transactions/TransactionList.tsx`
- 测试：`src/features/transactions/TransactionList.test.tsx`

- [ ] 编写失败测试：分别点击商品名称、交易状态、购入日期、售出日期、购入成本、运费、成交价和备注，断言 `onOpen(record, field)`；断言持有天数、总成本和利润不是字段编辑按钮。
- [ ] 运行 `npm test -- src/features/transactions/TransactionList.test.tsx`，确认因缺少字段参数与入口而失败。
- [ ] 导出 `EditableTransactionField`，把八个可编辑值渲染为统一字段按钮，桌面端和移动端都传递对应字段键。
- [ ] 增加字段按钮的悬停、焦点和布局样式。
- [ ] 重跑列表测试并确认通过。

### 任务 2：抽屉目标聚焦

**文件：**

- 修改：`src/features/transactions/TransactionDrawer.tsx`
- 测试：`src/features/transactions/TransactionDrawer.test.tsx`

- [ ] 编写失败测试：传入 `initialFocus="status"` 时状态下拉框获得焦点；传入 `initialFocus="note"` 时备注获得焦点且插入光标位于末尾；未传目标的新增交易仍聚焦商品名称。
- [ ] 运行 `npm test -- src/features/transactions/TransactionDrawer.test.tsx`，确认因缺少 `initialFocus` 而失败。
- [ ] 为八个表单控件建立 ref 映射，在抽屉打开后的现有焦点定时器中聚焦目标；文本类控件将 selectionStart/selectionEnd 设置为值长度；无效目标回退商品名称。
- [ ] 重跑抽屉测试并确认通过。

### 任务 3：页面串联与回归验证

**文件：**

- 修改：`src/pages/TransactionsPage.tsx`
- 测试：`src/pages/TransactionsPage.test.tsx`

- [ ] 编写失败测试：点击桌面交易状态后抽屉打开且状态控件获得焦点。
- [ ] 运行 `npm test -- src/pages/TransactionsPage.test.tsx`，确认目标焦点尚未串联导致失败。
- [ ] 页面保存目标字段，`TransactionList.onOpen` 同步设置记录与字段，`TransactionDrawer.initialFocus` 接收该字段；新增入口显式使用商品名称。
- [ ] 重跑页面测试并确认通过。
- [ ] 运行 `npm test`、`npm run typecheck`、`npm run lint`、`npm run format` 和 `npm run build`，逐项确认退出码为 0。
