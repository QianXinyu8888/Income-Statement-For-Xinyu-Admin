# 设置页实时角色同步实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 每次进入或刷新设置页时，从飞书“系统用户”表同步当前账号的最新角色，并删除安全提示。

**架构：** `/auth/session` 验证签名 Session 后，以其中的用户名回查飞书用户表并返回最新角色。设置页复用 `['session']` 查询缓存，但通过 `refetchOnMount: 'always'` 强制每次挂载刷新，并明确展示同步中或同步失败状态。

**技术栈：** TypeScript、Cloudflare Pages Functions、React、TanStack Query、Vitest、Testing Library。

---

## 文件结构

- 创建 `functions/api/v1/auth/[[path]].test.ts`：验证 session 接口实时回查角色及账号异常行为。
- 修改 `functions/api/v1/auth/[[path]].ts`：复用用户字段解析逻辑，并在 session 请求中回查飞书。
- 修改 `src/pages/SettingsPage.test.tsx`：验证新鲜缓存仍会刷新、同步状态及安全提示移除。
- 修改 `src/pages/SettingsPage.tsx`：强制挂载刷新、展示同步状态并删除安全提示。

### 任务 1：让 session 接口返回飞书最新角色

**文件：**
- 创建：`functions/api/v1/auth/[[path]].test.ts`
- 修改：`functions/api/v1/auth/[[path]].ts`

- [x] **步骤 1：编写失败的 API 测试**

使用 `vi.mock` 隔离环境解析、Session 验证和飞书读取，调用 `onRequest` 并断言：令牌角色为“用户”时，飞书记录角色“管理员”覆盖旧值；角色为空时返回“用户”；记录不存在或状态为“禁用”时返回 401。

```ts
expect(payload.data.user).toEqual({ username: 'xinyu', role: '管理员' });
expect(listUsers).toHaveBeenCalledOnce();
```

- [x] **步骤 2：运行测试并确认红灯**

运行：`npm test -- 'functions/api/v1/auth/[[path]].test.ts'`
预期：最新角色断言失败，因为 session 分支仍直接返回令牌用户且未调用 `listUsers`。

- [x] **步骤 3：实现最少后端改动**

在认证路由中提取用户记录解析函数，统一处理“状态”和“角色”；登录继续按用户名、密码和启用状态匹配，session 分支则按令牌用户名匹配启用记录并返回最新角色。角色字段缺失或空字符串时使用“用户”，用户不存在或已禁用时返回 `ACCOUNT_UNAVAILABLE` 401。

```ts
const users = await listUsers(config);
const user = findActiveUser(users, sessionUser.username);
return user
  ? jsonResponse(request, { user })
  : errorResponse(request, 401, 'ACCOUNT_UNAVAILABLE', '账号不存在或已禁用');
```

- [x] **步骤 4：运行 API 测试确认绿灯**

运行：`npm test -- 'functions/api/v1/auth/[[path]].test.ts'`
预期：该测试文件全部通过。

### 任务 2：设置页强制同步并删除安全提示

**文件：**
- 修改：`src/pages/SettingsPage.test.tsx`
- 修改：`src/pages/SettingsPage.tsx`

- [ ] **步骤 1：编写失败的页面测试**

预填充 `['session']` 为旧角色，渲染设置页后断言 `apiClient.session` 仍被调用并最终显示新角色；另断言页面不存在“安全提示”。

```ts
client.setQueryData(['session'], { user: { username: 'xinyu', role: '用户' } });
expect(await screen.findByText('管理员')).toBeInTheDocument();
expect(screen.queryByText('安全提示')).not.toBeInTheDocument();
```

- [ ] **步骤 2：运行测试并确认红灯**

运行：`npm test -- src/pages/SettingsPage.test.tsx`
预期：缓存角色保持“用户”，且“安全提示”仍存在。

- [ ] **步骤 3：实现最少前端改动**

为 session 查询增加 `refetchOnMount: 'always'`；角色显示根据请求状态输出“同步中”“同步失败”或最新 `user.role`；删除 `.security-note` JSX 区块。

```tsx
const session = useQuery({
  queryKey: ['session'],
  queryFn: apiClient.session,
  retry: false,
  refetchOnMount: 'always',
});
```

- [ ] **步骤 4：运行页面测试确认绿灯**

运行：`npm test -- src/pages/SettingsPage.test.tsx`
预期：该测试文件全部通过。

### 任务 3：整体回归验证

**文件：**
- 验证上述全部变更，不修改无关文件。

- [ ] **步骤 1：运行完整质量检查**

依次运行：

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

预期：全部命令退出码为 0，测试无失败，构建完成，diff 无空白错误。

- [ ] **步骤 2：检查需求和变更范围**

检查 `git diff -- functions/api/v1/auth/[[path]].ts functions/api/v1/auth/[[path]].test.ts src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx`，确认角色来自飞书最新记录、进入设置页强制刷新、安全提示已删除，且无无关修改。
