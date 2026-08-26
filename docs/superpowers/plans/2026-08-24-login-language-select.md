# 登录页语言下拉菜单实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用 `- [ ]` 语法进行跟踪。

**目标：** 将登录页右上角的语言按钮组改为包含国旗图标和文本的原生下拉选择框。

**架构：** 复用现有 `LanguageProvider` 的 `language` 与 `setLanguage`，在 `LoginPage` 中用 `<select>` 替换两个按钮；样式保持登录页的紧凑右上角布局。

**技术栈：** React、TypeScript、Testing Library、CSS。

---

### 任务 1：更新登录页语言控件与测试

**文件：**
- 修改：`src/pages/LoginPage.tsx`
- 修改：`src/pages/LoginPage.test.tsx`
- 修改：`src/styles.css`

- [ ] 将语言按钮组替换为带 `aria-label` 的 `<select>`，选项为 `🇨🇳 简体中文` 和 `🇺🇸 English`。
- [ ] 在 `onChange` 中调用现有 `setLanguage`，保留语言持久化和页面文案切换行为。
- [ ] 更新测试，断言选择框、两个带图标选项和切换后的英文页面。
- [ ] 调整 CSS，使原生选择框与原有登录页右上角视觉一致，并支持小屏显示。
- [ ] 运行登录页测试、类型检查和生产构建。
