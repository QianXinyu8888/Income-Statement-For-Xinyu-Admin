# 待收货状态页实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 让“待收货”与“在售中”“自用中”一样使用产品状态管理界面，并只加载待收货交易。

**架构：** 扩展现有 `SelfUsePage` 的状态类型与文案分支，复用其搜索、排序、列表和编辑抽屉；将 `/pending-receipt` 路由从通用交易明细页切换到该状态页。待收货不提供在售/自用之间的状态切换或售出操作。

**技术栈：** React、TypeScript、React Query、React Testing Library、Vitest。

---

### 任务 1：为待收货状态页补充失败测试

**文件：**
- 修改：`src/pages/SelfUsePage.test.tsx`
- 修改：`src/domain/self-use.ts`

- [ ] **步骤 1：扩展状态类型并编写页面行为测试**

测试待收货页请求 `status: '待收货'`，显示待收货产品列表，并不显示在售/自用状态切换按钮。

- [ ] **步骤 2：运行测试确认失败**

运行：`npm test -- src/pages/SelfUsePage.test.tsx`

预期：TypeScript 或测试失败，原因是当前状态类型和页面不支持“待收货”。

### 任务 2：实现待收货状态页并接入路由

**文件：**
- 修改：`src/domain/self-use.ts`
- 修改：`src/pages/SelfUsePage.tsx`
- 修改：`src/App.tsx`

- [ ] **步骤 1：扩展允许的页面状态**

将状态类型扩展为 `待收货 | 在售中 | 自用中`，并为待收货提供独立标题、搜索标签、管理文案和排序体验。

- [ ] **步骤 2：限制待收货页的状态操作**

待收货页面复用产品列表与编辑抽屉，但不显示“转为在售中/自用中”的状态操作，也不显示售出确认流程。

- [ ] **步骤 3：把 `/pending-receipt` 路由指向状态页**

保留 `/transactions` 的通用明细页筛选能力；仅将待收货导航入口切换为 `SelfUsePage status="待收货"`。

### 任务 3：验证并整理变更

**文件：**
- 修改：`src/pages/SelfUsePage.test.tsx`

- [ ] **步骤 1：运行目标测试**

运行：`npm test -- src/pages/SelfUsePage.test.tsx src/App.test.tsx`

- [ ] **步骤 2：运行完整验证**

运行：`npm test && npm run typecheck && npm run lint && npm run build && git diff --check`

- [ ] **步骤 3：检查变更范围**

确认只修改待收货状态页、路由和对应测试，不修改飞书字段、交易计算公式或既有状态页行为。
