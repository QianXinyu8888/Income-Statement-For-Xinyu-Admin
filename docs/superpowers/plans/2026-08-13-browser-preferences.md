# 网页端浏览器偏好实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 增加当前浏览器内持久化的交易字段显示、三态主题和分析月份偏好，并保证桌面与手机浏览器无字段错位或内容溢出。

**架构：** 使用一个带版本号的纯存储模块负责校验、旧键迁移与安全降级，再由 React Provider 向页面暴露偏好和更新动作。交易字段面板与分析月份控件保留在各自 feature 中；桌面表格与手机卡片共享字段 ID，但继续使用独立的响应式布局。

**技术栈：** React 18、TypeScript、Vite、TanStack Query、React Router、Vitest、Testing Library、原生 `localStorage` 与 `matchMedia`。

**持久化边界：** 所有偏好只写入当前浏览器，不新增后端接口，也不做账号级或跨设备同步。

---

## 开始前检查

当前工作区包含月度利润图表、分页和交易页的未提交修改。执行本计划前必须先运行：

```bash
git status --short
git diff -- src/pages/AnalyticsPage.tsx src/pages/AnalyticsPage.test.tsx src/pages/TransactionsPage.tsx src/pages/TransactionsPage.test.tsx src/styles.css
```

保留这些修改，不得用 checkout、reset 或整文件覆盖。`src/features/analytics/MonthlyProfitChart.tsx`、`MonthlyProfitChart.test.tsx`、`monthly-profit-chart.ts` 和 `monthly-profit-chart.test.ts` 属于现有月度利润功能，本计划不修改它们。

执行代码变更前，在包含这些现有修改的基线提交上创建专用 worktree；如果这些修改尚未形成提交，先让其所有者完成或明确整理方式，不要擅自暂存或提交。

## 文件结构

### 新建文件

- `src/preferences/browser-preferences.ts`：偏好类型、默认值、校验、旧键迁移、安全读写和年月格式工具。
- `src/preferences/browser-preferences.test.ts`：纯存储行为、迁移、损坏数据、字段约束和年月默认值测试。
- `src/preferences/BrowserPreferencesContext.tsx`：Provider、主题解析、系统主题监听和页面消费 hook。
- `src/preferences/BrowserPreferencesContext.test.tsx`：系统主题响应、明确主题隔离、快捷切换和 DOM 副作用测试。
- `src/features/transactions/ColumnVisibilityPanel.tsx`：交易页“列”按钮、字段开关、恢复默认和关闭行为。
- `src/features/transactions/ColumnVisibilityPanel.test.tsx`：面板可访问性、字段锁定、开关、恢复默认和键盘关闭测试。
- `src/features/analytics/analysis-month.ts`：有效年月校验与自然月起止日期计算。
- `src/features/analytics/analysis-month.test.ts`：大小月、闰年和非法输入测试。
- `src/features/analytics/AnalysisMonthControl.tsx`：年月输入与“重置为本月”按钮。

### 修改文件

- `src/main.tsx`：在路由外层挂载 `BrowserPreferencesProvider`。
- `src/App.tsx`：移除页面内主题存储状态，改用 Provider 的实际主题和快捷切换动作。
- `src/pages/SettingsPage.tsx`：增加三态主题控件，并将缩减动画切换到统一偏好层。
- `src/pages/SettingsPage.test.tsx`：验证主题模式与缩减动画偏好。
- `src/pages/TransactionsPage.tsx`：在工具栏接入列面板，把可见字段传给列表。
- `src/pages/TransactionsPage.test.tsx`：验证列面板集成和浏览器偏好恢复。
- `src/features/transactions/TransactionList.tsx`：按字段 ID 同步条件渲染桌面列和手机详情。
- `src/features/transactions/TransactionList.test.tsx`：验证默认全字段、字段隐藏、标题强制显示和两端一致。
- `src/pages/AnalyticsPage.tsx`：用保存的年月及自然月边界替代起止日期本地状态。
- `src/pages/AnalyticsPage.test.tsx`：验证默认本月、选择、刷新恢复、重置与接口日期。
- `src/styles.css`：增加主题分段控件、列弹层/手机底部面板、年月控件和安全换行样式；移除会按位置隐藏手机字段的规则。

## 任务 1：建立有版本的浏览器偏好存储

**文件：**

- 创建：`src/preferences/browser-preferences.ts`
- 创建：`src/preferences/browser-preferences.test.ts`

- [ ] **步骤 1：编写默认值、迁移、校验和安全降级的失败测试**

在 `src/preferences/browser-preferences.test.ts` 写出以下完整行为集：

```ts
import { describe, expect, it } from 'vitest';
import {
  ALL_TRANSACTION_FIELDS,
  PREFERENCES_STORAGE_KEY,
  readPreferences,
  writePreferences,
} from './browser-preferences';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const august = new Date(2026, 7, 13, 12);

describe('browser preferences storage', () => {
  it('defaults a new browser to system theme, all fields, this month and full motion', () => {
    const storage = new MemoryStorage();
    expect(readPreferences(storage, august)).toEqual({
      version: 1,
      themeMode: 'system',
      visibleTransactionFields: ALL_TRANSACTION_FIELDS,
      analysisMonth: '2026-08',
      reduceMotion: false,
    });
  });

  it('migrates legacy explicit theme and reduced motion values', () => {
    const storage = new MemoryStorage();
    storage.values.set('theme', 'dark');
    storage.values.set('reduce-motion', 'true');
    expect(readPreferences(storage, august)).toMatchObject({
      themeMode: 'dark',
      reduceMotion: true,
    });
  });

  it('filters unknown fields, deduplicates values and restores the required title field', () => {
    const storage = new MemoryStorage();
    storage.values.set(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        themeMode: 'light',
        visibleTransactionFields: ['profit', 'futureField', 'profit'],
        analysisMonth: '2026-03',
        reduceMotion: false,
      }),
    );
    expect(readPreferences(storage, august).visibleTransactionFields).toEqual(['title', 'profit']);
  });

  it.each(['{bad json', JSON.stringify({ version: 99 })])(
    'falls back safely for invalid persisted data: %s',
    (raw) => {
      const storage = new MemoryStorage();
      storage.values.set(PREFERENCES_STORAGE_KEY, raw);
      expect(readPreferences(storage, august)).toMatchObject({
        themeMode: 'system',
        analysisMonth: '2026-08',
      });
    },
  );

  it('replaces an invalid month with the current local month', () => {
    const storage = new MemoryStorage();
    storage.values.set(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        themeMode: 'system',
        visibleTransactionFields: ['title'],
        analysisMonth: '2026-13',
        reduceMotion: false,
      }),
    );
    expect(readPreferences(storage, august).analysisMonth).toBe('2026-08');
  });

  it('returns false instead of throwing when storage rejects writes', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('denied');
      },
    };
    const preferences = readPreferences(storage, august);
    expect(writePreferences(storage, preferences)).toBe(false);
  });
});
```

- [ ] **步骤 2：运行测试并确认缺少模块而失败**

运行：

```bash
npx vitest run src/preferences/browser-preferences.test.ts
```

预期：FAIL，报告无法解析 `./browser-preferences`。

- [ ] **步骤 3：实现最小的类型、默认值、校验和安全读写**

在 `src/preferences/browser-preferences.ts` 实现以下公开接口；校验函数必须先过滤未知字段，再按 `ALL_TRANSACTION_FIELDS` 的稳定顺序返回结果：

```ts
export const PREFERENCES_STORAGE_KEY = 'xinyu-admin.preferences';

export const ALL_TRANSACTION_FIELDS = [
  'title',
  'status',
  'purchaseDate',
  'soldDate',
  'holdingDays',
  'costPrice',
  'shippingFee',
  'totalCost',
  'salePrice',
  'profit',
  'note',
] as const;

export type TransactionFieldId = (typeof ALL_TRANSACTION_FIELDS)[number];
export type ThemeMode = 'system' | 'light' | 'dark';

export interface BrowserPreferencesV1 {
  version: 1;
  themeMode: ThemeMode;
  visibleTransactionFields: TransactionFieldId[];
  analysisMonth: string;
  reduceMotion: boolean;
}

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function localMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function isValidMonth(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12;
}

function defaults(now: Date): BrowserPreferencesV1 {
  return {
    version: 1,
    themeMode: 'system',
    visibleTransactionFields: [...ALL_TRANSACTION_FIELDS],
    analysisMonth: localMonth(now),
    reduceMotion: false,
  };
}

export function readPreferences(
  storage: PreferenceStorage,
  now = new Date(),
): BrowserPreferencesV1 {
  const fallback = defaults(now);
  try {
    const raw = storage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) {
      const legacyTheme = storage.getItem('theme');
      const legacyMotion = storage.getItem('reduce-motion');
      return {
        ...fallback,
        themeMode: legacyTheme === 'light' || legacyTheme === 'dark' ? legacyTheme : 'system',
        reduceMotion: legacyMotion === 'true',
      };
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.version !== 1) return fallback;
    const selected = new Set(
      Array.isArray(parsed.visibleTransactionFields) ? parsed.visibleTransactionFields : [],
    );
    selected.add('title');
    return {
      version: 1,
      themeMode:
        parsed.themeMode === 'light' || parsed.themeMode === 'dark' || parsed.themeMode === 'system'
          ? parsed.themeMode
          : fallback.themeMode,
      visibleTransactionFields: ALL_TRANSACTION_FIELDS.filter((field) => selected.has(field)),
      analysisMonth: isValidMonth(parsed.analysisMonth)
        ? parsed.analysisMonth
        : fallback.analysisMonth,
      reduceMotion:
        typeof parsed.reduceMotion === 'boolean' ? parsed.reduceMotion : fallback.reduceMotion,
    };
  } catch {
    return fallback;
  }
}

export function writePreferences(
  storage: PreferenceStorage,
  preferences: BrowserPreferencesV1,
): boolean {
  try {
    storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **步骤 4：运行存储测试并确认通过**

运行：

```bash
npx vitest run src/preferences/browser-preferences.test.ts
```

预期：7 个测试全部 PASS。

- [ ] **步骤 5：提交纯存储层**

```bash
git add src/preferences/browser-preferences.ts src/preferences/browser-preferences.test.ts
git commit -m "feat: 添加浏览器偏好存储层"
```

## 任务 2：接入全局 Provider 与三态主题

**文件：**

- 创建：`src/preferences/BrowserPreferencesContext.tsx`
- 创建：`src/preferences/BrowserPreferencesContext.test.tsx`
- 修改：`src/main.tsx`
- 修改：`src/App.tsx`

- [ ] **步骤 1：编写 Provider 的失败测试**

在测试中使用可控制的 `MediaQueryList`，验证系统模式、明确模式、快捷切换、根节点主题和缩减动画 class：

```tsx
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrowserPreferencesProvider, useBrowserPreferences } from './BrowserPreferencesContext';

function Consumer() {
  const value = useBrowserPreferences();
  return (
    <>
      <output aria-label="mode">{value.preferences.themeMode}</output>
      <output aria-label="effective">{value.effectiveTheme}</output>
      <button onClick={value.toggleTheme}>快捷切换</button>
      <button onClick={() => value.setThemeMode('system')}>系统</button>
      <button onClick={() => value.setThemeMode('dark')}>深色</button>
      <button onClick={() => value.setReduceMotion(true)}>缩减动画</button>
    </>
  );
}

function installMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return matches;
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.delete(listener),
    dispatchEvent: () => true,
  }));
  return (next: boolean) => {
    matches = next;
    listeners.forEach((listener) => listener({ matches: next } as MediaQueryListEvent));
  };
}

describe('BrowserPreferencesProvider', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('reduce-motion');
    vi.unstubAllGlobals();
  });

  it('follows system changes only in system mode', async () => {
    const changeSystem = installMatchMedia(false);
    render(
      <BrowserPreferencesProvider>
        <Consumer />
      </BrowserPreferencesProvider>,
    );
    expect(screen.getByLabelText('effective')).toHaveTextContent('light');
    act(() => changeSystem(true));
    expect(screen.getByLabelText('effective')).toHaveTextContent('dark');
    await userEvent.click(screen.getByRole('button', { name: '深色' }));
    act(() => changeSystem(false));
    expect(screen.getByLabelText('effective')).toHaveTextContent('dark');
  });

  it('turns a quick toggle into the explicit opposite theme', async () => {
    installMatchMedia(true);
    render(
      <BrowserPreferencesProvider>
        <Consumer />
      </BrowserPreferencesProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: '快捷切换' }));
    expect(screen.getByLabelText('mode')).toHaveTextContent('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('applies reduced motion to the document root', async () => {
    installMatchMedia(false);
    render(
      <BrowserPreferencesProvider>
        <Consumer />
      </BrowserPreferencesProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: '缩减动画' }));
    expect(document.documentElement).toHaveClass('reduce-motion');
  });
});
```

- [ ] **步骤 2：运行 Provider 测试并确认失败**

运行：

```bash
npx vitest run src/preferences/BrowserPreferencesContext.test.tsx
```

预期：FAIL，报告无法解析 `BrowserPreferencesContext`。

- [ ] **步骤 3：实现 Provider 的最小公开接口**

Provider 必须暴露以下稳定接口，所有集合更新都保持 `ALL_TRANSACTION_FIELDS` 的定义顺序：

```ts
interface BrowserPreferencesContextValue {
  preferences: BrowserPreferencesV1;
  effectiveTheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setTransactionFieldVisible: (field: TransactionFieldId, visible: boolean) => void;
  resetTransactionFields: () => void;
  setAnalysisMonth: (month: string) => void;
  setReduceMotion: (value: boolean) => void;
}
```

实现要点：

```tsx
const getStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => undefined };
  }
};

const getSystemTheme = (): 'light' | 'dark' =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

// state 初始化：readPreferences(getStorage())
// state 更新后：writePreferences(getStorage(), preferences)
// effectiveTheme：system 使用 systemTheme，否则使用 preferences.themeMode
// 根节点副作用：dataset.theme = effectiveTheme；classList.toggle('reduce-motion', ...)
// system effect：仅在 system 模式下订阅 change，并在 cleanup 中移除监听
// toggleTheme：根据 effectiveTheme 写入明确的相反 themeMode
// title 字段在 setTransactionFieldVisible 中忽略 false 请求
// setAnalysisMonth 仅接受 isValidMonth(month) 为 true 的值
```

- [ ] **步骤 4：在应用入口接入 Provider，并让 App 使用它**

`src/main.tsx` 中让 Provider 包住 `BrowserRouter`：

```tsx
<QueryClientProvider client={queryClient}>
  <BrowserPreferencesProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </BrowserPreferencesProvider>
</QueryClientProvider>
```

`src/App.tsx` 删除 `useState` / `useEffect` 的主题代码，并替换为：

```tsx
const { effectiveTheme, toggleTheme } = useBrowserPreferences();

<AppShell user={session.data.user} theme={effectiveTheme} onTheme={toggleTheme} />;
```

- [ ] **步骤 5：运行 Provider、AppShell 与类型检查**

运行：

```bash
npx vitest run src/preferences/BrowserPreferencesContext.test.tsx src/components/AppShell.test.tsx
npm run typecheck
```

预期：Provider 3 个测试和现有 AppShell 测试全部 PASS；TypeScript 无错误。

- [ ] **步骤 6：提交 Provider 与应用接入**

```bash
git add src/preferences/BrowserPreferencesContext.tsx src/preferences/BrowserPreferencesContext.test.tsx src/main.tsx src/App.tsx
git commit -m "feat: 接入全局浏览器偏好"
```

## 任务 3：在设置页增加主题模式并迁移缩减动画

**文件：**

- 修改：`src/pages/SettingsPage.tsx`
- 修改：`src/pages/SettingsPage.test.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：为三态主题和缩减动画编写失败测试**

更新测试渲染器，用 `BrowserPreferencesProvider` 包裹 `SettingsPage`，并增加：

```tsx
it('chooses system, light or dark theme and keeps reduced motion in browser preferences', async () => {
  vi.spyOn(apiClient, 'session').mockResolvedValue({
    user: { username: 'xinyu', role: '管理员' },
  });
  vi.spyOn(apiClient, 'health').mockResolvedValue({ connected: true, checkedAt: '2026-08-13' });
  const user = userEvent.setup();
  renderPage();

  const theme = await screen.findByRole('radiogroup', { name: '主题模式' });
  expect(within(theme).getByRole('radio', { name: '跟随系统' })).toBeChecked();
  await user.click(within(theme).getByRole('radio', { name: '深色' }));
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

  await user.click(screen.getByRole('checkbox', { name: /缩减界面动画/ }));
  expect(document.documentElement).toHaveClass('reduce-motion');
});
```

同时给 `renderPage` 增加 Provider，并在 `afterEach` 清理 `localStorage` 和根节点主题/class。

- [ ] **步骤 2：运行设置页测试并确认缺少主题控件而失败**

运行：

```bash
npx vitest run src/pages/SettingsPage.test.tsx
```

预期：FAIL，找不到名为“主题模式”的 radiogroup。

- [ ] **步骤 3：实现设置页三态控件与统一缩减动画**

删除页面直接访问 `localStorage` 的 state/effect，改为：

```tsx
const {
  preferences: { themeMode, reduceMotion },
  setThemeMode,
  setReduceMotion,
} = useBrowserPreferences();
```

在“界面与动画偏好”列表中先加入主题行：

```tsx
<div>
  <dt>主题模式</dt>
  <dd>
    <fieldset className="theme-segmented" aria-label="主题模式">
      {(
        [
          ['system', '跟随系统'],
          ['light', '浅色'],
          ['dark', '深色'],
        ] as const
      ).map(([value, label]) => (
        <label key={value}>
          <input
            type="radio"
            name="themeMode"
            value={value}
            checked={themeMode === value}
            onChange={() => setThemeMode(value)}
          />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  </dd>
</div>
```

现有 checkbox 改用 `reduceMotion` 与 `setReduceMotion(event.target.checked)`。

- [ ] **步骤 4：增加主题分段控件的响应式样式**

在 `src/styles.css` 的设置样式附近增加 `.theme-segmented`、隐藏原生 radio 但保留可访问性、选中态与 `:focus-visible`。在 `max-width: 680px` 下允许三项等宽且容器最大宽度为 100%，标签文字不得溢出。

- [ ] **步骤 5：运行设置页、Provider 测试与类型检查**

运行：

```bash
npx vitest run src/pages/SettingsPage.test.tsx src/preferences/BrowserPreferencesContext.test.tsx
npm run typecheck
```

预期：全部 PASS，设置页不再直接调用 `localStorage`。

- [ ] **步骤 6：提交设置页主题控件**

```bash
git add src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx src/styles.css
git commit -m "feat: 设置页支持跟随系统主题"
```

## 任务 4：增加交易列按钮并同步桌面与手机字段

**文件：**

- 创建：`src/features/transactions/ColumnVisibilityPanel.tsx`
- 创建：`src/features/transactions/ColumnVisibilityPanel.test.tsx`
- 修改：`src/pages/TransactionsPage.tsx`
- 修改：`src/pages/TransactionsPage.test.tsx`
- 修改：`src/features/transactions/TransactionList.tsx`
- 修改：`src/features/transactions/TransactionList.test.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：为独立列面板编写失败测试**

使用一个 stateful Harness 传入字段集合，覆盖打开状态、锁定标题、隐藏字段、恢复全部与 Esc：

```tsx
function Harness() {
  const [visible, setVisible] = useState<TransactionFieldId[]>([...ALL_TRANSACTION_FIELDS]);
  return (
    <ColumnVisibilityPanel
      visibleFields={visible}
      onFieldVisible={(field, nextVisible) =>
        setVisible((current) =>
          nextVisible
            ? ALL_TRANSACTION_FIELDS.filter((item) => current.includes(item) || item === field)
            : current.filter((item) => item !== field),
        )
      }
      onReset={() => setVisible([...ALL_TRANSACTION_FIELDS])}
    />
  );
}

it('toggles optional fields, locks title, restores defaults and closes with Escape', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: '选择显示字段' });
  await user.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('checkbox', { name: '商品名称' })).toBeDisabled();
  await user.click(screen.getByRole('checkbox', { name: '备注' }));
  expect(screen.getByRole('checkbox', { name: '备注' })).not.toBeChecked();
  await user.click(screen.getByRole('button', { name: '恢复默认列' }));
  expect(screen.getByRole('checkbox', { name: '备注' })).toBeChecked();
  await user.keyboard('{Escape}');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trigger).toHaveFocus();
});
```

- [ ] **步骤 2：运行列面板测试并确认失败**

运行：

```bash
npx vitest run src/features/transactions/ColumnVisibilityPanel.test.tsx
```

预期：FAIL，无法解析 `ColumnVisibilityPanel`。

- [ ] **步骤 3：实现可访问的列按钮和面板**

使用 `ALL_TRANSACTION_FIELDS` 和固定中文标签映射。组件根节点持有 trigger/panel refs；打开时聚焦第一个非禁用 checkbox；document `pointerdown` 检测点击外部；keydown `Escape` 关闭并把焦点还给 trigger。

触发器使用：

```tsx
<button
  ref={triggerRef}
  type="button"
  className="button button--secondary column-visibility__trigger"
  aria-label="选择显示字段"
  aria-expanded={open}
  aria-controls={panelId}
  onClick={() => setOpen((value) => !value)}
>
  <Columns3 size={16} aria-hidden="true" />列
</button>
```

面板使用 `role="dialog" aria-label="显示字段"`，商品名称 checkbox 设置 `disabled`，并提供明确的“恢复默认列”和“关闭字段选择”按钮。

- [ ] **步骤 4：先为 TransactionList 编写两端字段隐藏的失败测试**

给 `TransactionList` 增加必需 prop `visibleFields`，更新现有所有 render 调用默认传入 `[...ALL_TRANSACTION_FIELDS]`，再加入：

```tsx
it('uses the same visibility preferences in desktop and mobile layouts', () => {
  const { container } = render(
    <TransactionList
      records={[record]}
      selected={new Set()}
      visibleFields={['title', 'profit']}
      onToggle={vi.fn()}
      onOpen={vi.fn()}
    />,
  );
  expect(screen.getByRole('columnheader', { name: '商品名称' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: '利润' })).toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: '备注' })).not.toBeInTheDocument();
  expect(container.querySelector('.mobile-list')).toHaveTextContent('利润+¥1,082.00');
  expect(container.querySelector('.mobile-list')).not.toHaveTextContent('备注顺丰到付');
});
```

另加一个测试传入不含 `title` 的数组，确认商品名称仍在桌面与手机显示，防止调用者绕过 Provider 约束。

- [ ] **步骤 5：运行 TransactionList 测试并确认新断言失败**

运行：

```bash
npx vitest run src/features/transactions/TransactionList.test.tsx
```

预期：FAIL，组件尚不接受 `visibleFields` 或仍显示备注。

- [ ] **步骤 6：实现桌面与手机的同步条件渲染**

组件开头建立安全集合：

```tsx
const visible = new Set<TransactionFieldId>(['title', ...visibleFields]);
const shows = (field: TransactionFieldId) => visible.has(field);
const optionalCount = ALL_TRANSACTION_FIELDS.filter(
  (field) => field !== 'title' && visible.has(field),
).length;
const tableMinWidth = Math.max(640, 362 + optionalCount * 118);
```

桌面 `<table style={{ minWidth: tableMinWidth }}>`；每个字段的 `<th>` 与对应 `<td>` 使用相同的 `shows(field)` 条件。手机标题始终渲染，状态 span 和每个详情 `<div>` 分别按字段条件渲染；没有任何可选详情时不渲染空的 `<dl>`。

- [ ] **步骤 7：在交易页接入 Provider 与列面板**

`TransactionsPage` 获取：

```tsx
const {
  preferences: { visibleTransactionFields },
  setTransactionFieldVisible,
  resetTransactionFields,
} = useBrowserPreferences();
```

在筛选控件之后、导出按钮之前渲染 `ColumnVisibilityPanel`，并把 `visibleTransactionFields` 传给 `TransactionList`。更新页面测试渲染器使其包含 Provider；设置浏览器存储只显示 `title` 与 `profit`，重新渲染后断言交易列表恢复同一配置。

- [ ] **步骤 8：增加桌面弹层、手机底部面板和溢出样式**

在 `src/styles.css` 完成：

- `.column-visibility` 相对定位，桌面面板绝对定位到按钮下方右侧。
- 面板最大宽度不超过 `min(340px, calc(100vw - 32px))`，字段开关为两列网格，内容超高时内部滚动。
- `max-width: 680px` 下，面板使用 `position: fixed; left: 0; right: 0; bottom: 0`，包含安全区 padding、圆角顶部和受控最大高度。
- 不使用会被现有 `.toolbar .icon-button { display: none; }` 隐藏的 `icon-button` class。
- 删除 `.mobile-row__details > div:nth-child(3) { display: none; }`，因为字段位置会随可见性变化。
- 将 `.mobile-row__heading strong` 的单行省略改为 `white-space: normal; overflow-wrap: anywhere; word-break: break-word`。
- `.mobile-row__details > div`、`dt`、`dd` 保持 `min-width: 0`，金额和日期不得造成页面级横向滚动。

- [ ] **步骤 9：运行交易相关测试和类型检查**

运行：

```bash
npx vitest run src/features/transactions/ColumnVisibilityPanel.test.tsx src/features/transactions/TransactionList.test.tsx src/pages/TransactionsPage.test.tsx
npm run typecheck
```

预期：全部 PASS；现有交易编辑、选择、焦点定位、分页和导出测试无回归。

- [ ] **步骤 10：提交交易字段管理**

```bash
git add src/features/transactions/ColumnVisibilityPanel.tsx src/features/transactions/ColumnVisibilityPanel.test.tsx src/features/transactions/TransactionList.tsx src/features/transactions/TransactionList.test.tsx src/pages/TransactionsPage.tsx src/pages/TransactionsPage.test.tsx src/styles.css
git commit -m "feat: 交易列表支持字段显示偏好"
```

## 任务 5：增加分析年月选择与重置

**文件：**

- 创建：`src/features/analytics/analysis-month.ts`
- 创建：`src/features/analytics/analysis-month.test.ts`
- 创建：`src/features/analytics/AnalysisMonthControl.tsx`
- 修改：`src/pages/AnalyticsPage.tsx`
- 修改：`src/pages/AnalyticsPage.test.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：编写自然月边界的失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { analysisMonthBounds } from './analysis-month';

describe('analysisMonthBounds', () => {
  it.each([
    ['2026-01', { from: '2026-01-01', to: '2026-01-31' }],
    ['2026-04', { from: '2026-04-01', to: '2026-04-30' }],
    ['2024-02', { from: '2024-02-01', to: '2024-02-29' }],
    ['2025-02', { from: '2025-02-01', to: '2025-02-28' }],
  ])('converts %s to local calendar bounds', (month, expected) => {
    expect(analysisMonthBounds(month)).toEqual(expected);
  });

  it('throws for an invalid month so callers cannot issue an ambiguous query', () => {
    expect(() => analysisMonthBounds('2026-13')).toThrow('Invalid analysis month');
  });
});
```

- [ ] **步骤 2：运行月份工具测试并确认失败**

运行：

```bash
npx vitest run src/features/analytics/analysis-month.test.ts
```

预期：FAIL，无法解析 `analysis-month`。

- [ ] **步骤 3：实现自然月边界函数**

```ts
import { isValidMonth } from '../../preferences/browser-preferences';

export function analysisMonthBounds(month: string) {
  if (!isValidMonth(month)) throw new Error('Invalid analysis month');
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
}
```

- [ ] **步骤 4：运行月份工具测试并确认通过**

运行：

```bash
npx vitest run src/features/analytics/analysis-month.test.ts
```

预期：5 个测试全部 PASS。

- [ ] **步骤 5：为分析页默认、选择、恢复与重置编写失败测试**

更新 `renderPage` 用 Provider 包裹页面；从 Testing Library 导入 `fireEvent`；使用 `vi.useFakeTimers()` 与 `vi.setSystemTime(new Date(2026, 7, 13, 12))` 固定本地当前月。增加测试：

```tsx
it('queries the current month by default, remembers another month and resets to this month', async () => {
  const summarySpy = vi.spyOn(apiClient, 'summary').mockResolvedValue(summary);
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const first = renderPage();

  const month = await screen.findByLabelText('分析月份');
  expect(month).toHaveValue('2026-08');
  expect(summarySpy).toHaveBeenCalledWith('2026-08-01', '2026-08-31');

  fireEvent.change(month, { target: { value: '2026-02' } });
  expect(summarySpy).toHaveBeenLastCalledWith('2026-02-01', '2026-02-28');
  first.unmount();

  renderPage();
  expect(await screen.findByLabelText('分析月份')).toHaveValue('2026-02');
  await user.click(screen.getByRole('button', { name: '重置为本月' }));
  expect(screen.getByLabelText('分析月份')).toHaveValue('2026-08');
  expect(summarySpy).toHaveBeenLastCalledWith('2026-08-01', '2026-08-31');
});
```

- [ ] **步骤 6：运行分析页测试并确认仍使用无边界查询而失败**

运行：

```bash
npx vitest run src/pages/AnalyticsPage.test.tsx
```

预期：新增测试 FAIL，页面仍调用 `apiClient.summary(undefined, undefined)` 且找不到“分析月份”。

- [ ] **步骤 7：实现年月控件并接入 AnalyticsPage**

`AnalysisMonthControl.tsx` 接口固定为：

```tsx
interface AnalysisMonthControlProps {
  value: string;
  currentMonth: string;
  onChange: (month: string) => void;
  onReset: () => void;
}
```

渲染带可见 label 的 `<input type="month" aria-label="分析月份">` 和 `<button type="button">重置为本月</button>`；`onChange` 只转发非空值。

`AnalyticsPage` 替换 `from` / `to` state：

```tsx
const {
  preferences: { analysisMonth },
  setAnalysisMonth,
} = useBrowserPreferences();
const thisMonth = localMonth();
const { from, to } = analysisMonthBounds(analysisMonth);
const summary = useQuery({
  queryKey: ['summary', from, to],
  queryFn: () => apiClient.summary(from, to),
});
```

页头使用：

```tsx
<AnalysisMonthControl
  value={analysisMonth}
  currentMonth={thisMonth}
  onChange={setAnalysisMonth}
  onReset={() => setAnalysisMonth(thisMonth)}
/>
```

不要修改 `MonthlyProfitChart` 及现有下钻组件。

- [ ] **步骤 8：增加年月控件响应式样式**

复用现有输入视觉变量，新增 `.analysis-month-control`：桌面横向排列，`max-width: 680px` 下允许换行或两项纵向排列；输入和按钮均保持至少 44px 触控高度，宽度不得超过容器。

- [ ] **步骤 9：运行分析、月度图表和类型检查**

运行：

```bash
npx vitest run src/features/analytics/analysis-month.test.ts src/pages/AnalyticsPage.test.tsx src/features/analytics/MonthlyProfitChart.test.tsx src/features/analytics/monthly-profit-chart.test.ts
npm run typecheck
```

预期：全部 PASS；月度利润图表与分析下钻测试继续通过。

- [ ] **步骤 10：提交分析月份功能**

```bash
git add src/features/analytics/analysis-month.ts src/features/analytics/analysis-month.test.ts src/features/analytics/AnalysisMonthControl.tsx src/pages/AnalyticsPage.tsx src/pages/AnalyticsPage.test.tsx src/styles.css
git commit -m "feat: 利润分析支持按月选择"
```

## 任务 6：完整回归与网页端视觉验收

**文件：**

- 验证：所有本计划涉及的源文件与测试
- 仅在发现真实问题时修改对应文件，并为问题补充回归测试

- [ ] **步骤 1：运行格式、类型、lint、全量测试和构建**

```bash
npm run format
npm run typecheck
npm run lint
npm test
npm run build
```

预期：所有命令退出码为 0；Vitest 无失败测试；Vite 产出成功。

- [ ] **步骤 2：在浏览器验证桌面行为**

运行：

```bash
npm run dev
```

在常规桌面宽度逐项验证：

- 新浏览器默认跟随系统，系统主题变化后页面实时变化。
- 顶部快捷按钮把实际主题切换为明确的相反主题。
- 设置页能在三态主题间切换，缩减动画保持有效。
- 交易页默认显示全部 11 个业务字段；商品名称不能关闭。
- 任意隐藏交易状态、持有天数、备注等字段后，表头和数据严格对齐。
- “恢复默认列”恢复全部字段，刷新页面后选择仍保持。
- 分析页默认本月，选择大小月和闰年二月时查询结果范围正确，重置回本月。

- [ ] **步骤 3：在 320px 和 680px 宽度验证手机浏览器**

使用超长商品名称、超长备注、空值、大额金额和负利润记录，确认：

- 页面本身不产生横向滚动。
- 商品名称换行且始终可见，状态隐藏后标题区域不留空洞。
- 手机字段详情与桌面使用同一显示配置，奇数个详情项正常排列。
- 列面板从底部出现，不超过视口，内部内容可滚动，关闭后焦点回到“列”按钮。
- 年月输入和重置按钮不重叠、不溢出且可触控。
- 浅色与深色下文字、边框、选中态和禁用态清晰可辨。

- [ ] **步骤 4：检查最终 diff 只包含计划内变更**

```bash
git status --short
git diff --check
git log --oneline -6
```

预期：没有意外文件、尾随空格或未解释的未提交修改；最近提交与任务 1–5 一一对应。最终工作树只保留执行前已经确认属于其他工作的修改。
