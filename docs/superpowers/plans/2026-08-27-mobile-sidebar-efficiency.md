# 高效工具型手机侧边栏实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将手机侧边栏收敛为按业务目标分组的导航，并将主题与语言控制完全保留在设置页。

**架构：** `AppShell` 维持共享路由定义及抽屉焦点管理，仅改变移动抽屉内部的分组和页脚内容。移动样式为新分组标题和紧凑页脚提供布局；桌面顶栏不变，设置页继续作为偏好的唯一配置入口。

**技术栈：** React 18、React Router、TypeScript、Vitest、Testing Library、CSS 媒体查询。

---

## 文件结构

- 修改：`src/components/AppShell.tsx` — 为移动端渲染业务分组，将设置移动至抽屉底部，移除抽屉内主题及语言控件。
- 修改：`src/components/AppShell.test.tsx` — 验证分组、偏好入口和已移除的移动抽屉控件。
- 修改：`src/styles.css` — 样式化分组标题与紧凑底部动作，删除无主元素的移动语言样式。
- 修改：`src/i18n/translations.ts` — 为两项移动导航分组提供中英文文案。

### 任务 1：为高效工具型抽屉编写失败测试

**文件：**

- 修改：`src/components/AppShell.test.tsx`

- [ ] **步骤 1：添加失败测试，断言业务分组与偏好收纳。**

```tsx
expect(within(menu).getByRole('heading', { name: '交易管理' })).toBeInTheDocument();
expect(within(menu).getByRole('heading', { name: '经营分析' })).toBeInTheDocument();
expect(within(menu).getByRole('link', { name: '设置' })).toBeInTheDocument();
expect(within(menu).queryByRole('button', { name: '切换到深色模式' })).not.toBeInTheDocument();
expect(within(menu).queryByRole('button', { name: '简体中文' })).not.toBeInTheDocument();
```

- [ ] **步骤 2：运行测试，确认当前实现因缺少分组标题和底部设置链接而失败。**

运行：`npm test -- src/components/AppShell.test.tsx`

预期：FAIL，提示找不到“交易管理”标题。

### 任务 2：实现可本地化的分组导航与精简页脚

**文件：**

- 修改：`src/components/AppShell.tsx`
- 修改：`src/styles.css`
- 修改：`src/i18n/translations.ts`

- [ ] **步骤 1：定义移动端分组，在抽屉中按分组渲染现有 `navigation` 链接。**

```tsx
const mobileNavigationGroups = [
  { labelKey: 'nav.group.transactions', destinations: ['/transactions', '/listed', '/self-use'] },
  { labelKey: 'nav.group.analytics', destinations: ['/overview', '/analytics'] },
] as const;
```

- [ ] **步骤 2：将 `nav.group.transactions` 和 `nav.group.analytics` 加入 `TranslationKey`，并分别提供“交易管理”/“经营分析”及 “Transaction management”/“Business insights”文案。**

```ts
| 'nav.group.transactions'
| 'nav.group.analytics'
```

- [ ] **步骤 3：在 `mobile-sidebar__footer` 中渲染设置链接和退出按钮，移除主题按钮及语言切换器。**

```tsx
<NavLink to="/settings" onClick={() => closeMobileMenu(false)}>
  <Settings size={17} />
  <span>{t('nav.settings')}</span>
</NavLink>
<button type="button" className="mobile-sidebar__action mobile-sidebar__logout" onClick={logout}>
  <LogOut size={17} />
  {t('topbar.logout')}
</button>
```

- [ ] **步骤 4：为 `.mobile-sidebar__group` 和标题添加低权重样式，并使页脚链接与操作保持 44px 以上的触控高度。**

```css
.mobile-sidebar__group-title {
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.mobile-sidebar__footer a,
.mobile-sidebar__action {
  min-height: 44px;
}
.mobile-sidebar__logout {
  color: var(--muted);
  opacity: 0.72;
}
```

- [ ] **步骤 5：运行抽屉测试确认通过。**

运行：`npm test -- src/components/AppShell.test.tsx`

预期：PASS。

### 任务 3：完整验证

**文件：**

- 测试：`src/components/AppShell.test.tsx`

- [ ] **步骤 1：运行静态检查、全部测试和生产构建。**

运行：`npm run typecheck && npm run lint && npm test && npm run build`

预期：所有命令以退出码 0 完成。

- [ ] **步骤 2：在 390px 宽视口确认抽屉中仅有两个业务分组、设置和退出登录。**

运行：`npm run dev -- --host 127.0.0.1`

预期：菜单可被打开和关闭，主题及语言只在设置页可见。

- [ ] **步骤 3：提交实现。**

```bash
git add docs/superpowers/specs/2026-08-27-mobile-sidebar-redesign-design.md docs/superpowers/plans/2026-08-27-mobile-sidebar-efficiency.md src/components/AppShell.tsx src/components/AppShell.test.tsx src/styles.css
git commit -m "feat: streamline mobile sidebar navigation"
```
