# 自用中工作区实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 新增 macOS 风格的“自用中”工作区，管理自用中/在售中物品，并通过售出确认窗口完成售出。

**架构：** 新页面以两个现有状态查询合并出工作区列表；独立域辅助函数负责筛选、排序、完整更新载荷和利润预览。页面负责 React Query 缓存、状态 mutation 和反馈，列表及售出窗口只通过回调与页面通信。

**技术栈：** React 18、TypeScript、React Router、TanStack Query、Vitest、Testing Library、lucide-react、现有 Cloudflare/飞书交易接口。

---

## 文件结构

| 文件 | 职责 |
| --- | --- |
| `src/domain/self-use.ts` | 自用工作区状态筛选、排序、交易更新载荷和利润计算 |
| `src/domain/self-use.test.ts` | 域行为的单元测试 |
| `src/pages/SelfUsePage.tsx` | 查询、搜索/筛选/排序、mutation、反馈和组件编排 |
| `src/pages/SelfUsePage.test.tsx` | 页面数据流、状态变更和失败处理测试 |
| `src/features/self-use/SelfUseList.tsx` | 桌面表格与移动列表、操作入口 |
| `src/features/self-use/SaleConfirmDialog.tsx` | 售出确认表单、利润预览、焦点管理 |
| `src/features/self-use/SaleConfirmDialog.test.tsx` | 表单校验、保存载荷和对话框键盘行为 |
| `src/App.tsx` | 懒加载和注册 `/self-use` 路由 |
| `src/components/AppShell.tsx` | 新导航入口 |
| `src/components/AppShell.test.tsx` | 新导航在桌面和移动端可达 |
| `src/i18n/translations.ts` | “自用中”导航中英文文案 |
| `src/styles.css` | macOS 风格工作区、表格、状态控件和售出窗口的响应式样式 |

### 任务 1：建立自用工作区域逻辑

**文件：**
- 创建：`src/domain/self-use.ts`
- 创建：`src/domain/self-use.test.ts`

- [ ] **步骤 1：编写失败的域测试**

```ts
import { describe, expect, it } from 'vitest';
import { createSaleInput, getSelfUseRecords, previewProfit } from './self-use';

it('keeps only self-use and listed records and orders them by the selected field', () => {
  expect(getSelfUseRecords(records, 'holdingDays', 'desc').map((record) => record.id)).toEqual([
    'listed',
    'personal',
  ]);
});

it('preserves non-sale fields when creating a sold update', () => {
  expect(createSaleInput(record, { salePrice: 1200, soldDate: '2026-08-27', note: '面交' })).toEqual(
    expect.objectContaining({ status: '已售出', costPrice: 900, shippingFee: 20 }),
  );
});

it('calculates sale profit only when both price and total cost exist', () => {
  expect(previewProfit(1200, 920)).toBe(280);
  expect(previewProfit(1200, null)).toBeNull();
});
```

- [ ] **步骤 2：运行域测试并确认红灯**

运行：`npm test -- src/domain/self-use.test.ts`  
预期：FAIL，模块 `./self-use` 尚不存在。

- [ ] **步骤 3：实现最小域辅助函数**

```ts
export const SELF_USE_STATUSES = ['自用中', '在售中'] as const;

export function previewProfit(salePrice: number | null, totalCost: number | null) {
  return salePrice === null || totalCost === null ? null : salePrice - totalCost;
}

export function createSaleInput(record: Transaction, sale: SaleFormValues): TransactionInput {
  if (!record.title) throw new Error('商品名称为空，无法确认售出');
  return { title: record.title, salePrice: sale.salePrice, costPrice: record.costPrice,
    shippingFee: record.shippingFee, status: '已售出', purchaseDate: record.purchaseDate,
    soldDate: sale.soldDate, note: sale.note || null };
}
```

- [ ] **步骤 4：运行域测试并确认绿灯**

运行：`npm test -- src/domain/self-use.test.ts`  
预期：PASS。

- [ ] **步骤 5：提交域逻辑**

```bash
git add src/domain/self-use.ts src/domain/self-use.test.ts
git commit -m "feat: 添加自用工作区域逻辑"
```

### 任务 2：注册页面和导航入口

**文件：**
- 修改：`src/App.tsx`
- 修改：`src/components/AppShell.tsx`
- 修改：`src/components/AppShell.test.tsx`
- 修改：`src/i18n/translations.ts`

- [ ] **步骤 1：编写失败的导航测试**

```ts
it('keeps self-use reachable from both desktop and mobile navigation', () => {
  renderShell();
  expect(screen.getAllByRole('link', { name: '自用中' })).toHaveLength(2);
});
```

- [ ] **步骤 2：运行导航测试并确认红灯**

运行：`npm test -- src/components/AppShell.test.tsx`  
预期：FAIL，找不到名称为“自用中”的链接。

- [ ] **步骤 3：注册路由和翻译键**

```tsx
const SelfUsePage = lazy(() => import('./pages/SelfUsePage'));

<Route path="/self-use" element={<Suspense fallback={<LoadingState />}><SelfUsePage /></Suspense>} />

{ to: '/self-use', labelKey: 'nav.selfUse', icon: MonitorCheck }
```

```ts
| 'nav.selfUse';

'nav.selfUse': '自用中',
// en: 'Personal use'
```

- [ ] **步骤 4：运行导航测试并确认绿灯**

运行：`npm test -- src/components/AppShell.test.tsx`  
预期：PASS。

- [ ] **步骤 5：提交导航入口**

```bash
git add src/App.tsx src/components/AppShell.tsx src/components/AppShell.test.tsx src/i18n/translations.ts
git commit -m "feat: 添加自用中导航入口"
```

### 任务 3：实现售出确认窗口

**文件：**
- 创建：`src/features/self-use/SaleConfirmDialog.tsx`
- 创建：`src/features/self-use/SaleConfirmDialog.test.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：编写失败的对话框测试**

```tsx
it('requires price and sold date and previews profit before submitting', async () => {
  render(<SaleConfirmDialog record={record} open saving={false} onClose={vi.fn()} onConfirm={onConfirm} />);
  await user.click(screen.getByRole('button', { name: '确认售出' }));
  expect(screen.getByRole('alert')).toHaveTextContent('请输入售价');
  await user.type(screen.getByRole('spinbutton', { name: '售价' }), '1450');
  expect(screen.getByText('利润')).toHaveTextContent('+¥151.00');
});
```

- [ ] **步骤 2：运行对话框测试并确认红灯**

运行：`npm test -- src/features/self-use/SaleConfirmDialog.test.tsx`  
预期：FAIL，模块 `./SaleConfirmDialog` 尚不存在。

- [ ] **步骤 3：实现可访问对话框与 macOS 风格样式**

```tsx
<section role="dialog" aria-modal="true" aria-labelledby="sale-dialog-title" className="sale-dialog">
  <h2 id="sale-dialog-title">确认售出</h2>
  <p>今天是你自用 {record.title} 的第 {record.holdingDays ?? '—'} 天</p>
  <label>售价 <input aria-label="售价" type="number" min="0" step="0.01" required /></label>
  <label>售出日期 <input aria-label="售出日期" type="date" required /></label>
  <label>备注 <textarea aria-label="备注" /></label>
  <div><span>利润</span><strong>{formatProfit(previewProfit(price, record.totalCost))}</strong></div>
</section>
```

- [ ] **步骤 4：运行对话框测试并确认绿灯**

运行：`npm test -- src/features/self-use/SaleConfirmDialog.test.tsx`  
预期：PASS。

- [ ] **步骤 5：提交售出确认窗口**

```bash
git add src/features/self-use/SaleConfirmDialog.tsx src/features/self-use/SaleConfirmDialog.test.tsx src/styles.css
git commit -m "feat: 添加售出确认窗口"
```

### 任务 4：实现自用列表与页面数据流

**文件：**
- 创建：`src/features/self-use/SelfUseList.tsx`
- 创建：`src/pages/SelfUsePage.tsx`
- 创建：`src/pages/SelfUsePage.test.tsx`
- 修改：`src/styles.css`

- [ ] **步骤 1：编写失败的页面交互测试**

```tsx
it('loads both active statuses and removes a record after sale confirmation', async () => {
  vi.spyOn(apiClient, 'transactions').mockResolvedValueOnce(personalPage).mockResolvedValueOnce(listedPage);
  vi.spyOn(apiClient, 'updateTransaction').mockResolvedValue({ ...personal, status: '已售出' });
  renderPage();
  await user.click(await screen.findByRole('checkbox', { name: '标记 耳机 已售出' }));
  await user.type(screen.getByRole('spinbutton', { name: '售价' }), '1450');
  await user.click(screen.getByRole('button', { name: '确认售出' }));
  await waitFor(() => expect(screen.queryByText('耳机')).not.toBeInTheDocument());
});

it('keeps the dialog open when selling fails', async () => {
  vi.spyOn(apiClient, 'updateTransaction').mockRejectedValue(new Error('网络异常'));
  // fill and submit
  expect(screen.getByRole('dialog')).toHaveTextContent('网络异常');
});
```

- [ ] **步骤 2：运行页面测试并确认红灯**

运行：`npm test -- src/pages/SelfUsePage.test.tsx`  
预期：FAIL，模块 `./SelfUsePage` 尚不存在。

- [ ] **步骤 3：实现列表、查询和 mutation**

```tsx
const result = useQuery({
  queryKey: ['self-use', search, statusFilter, sort, order],
  queryFn: async () => {
    const [personal, listed] = await Promise.all(SELF_USE_STATUSES.map((status) =>
      apiClient.transactions({ page: 1, pageSize: 100, status, q: search, sort: 'sourceOrder', order: 'asc' }),
    ));
    return getSelfUseRecords([...personal.items, ...listed.items], sort, order, statusFilter);
  },
});

const markListed = useMutation({ mutationFn: (id: string) => apiClient.batchStatus([id], '在售中') });
const sell = useMutation({ mutationFn: ({ record, values }) => apiClient.updateTransaction(record.id, createSaleInput(record, values)) });
```

- [ ] **步骤 4：运行页面测试并确认绿灯**

运行：`npm test -- src/pages/SelfUsePage.test.tsx`  
预期：PASS。

- [ ] **步骤 5：提交页面工作区**

```bash
git add src/features/self-use/SelfUseList.tsx src/pages/SelfUsePage.tsx src/pages/SelfUsePage.test.tsx src/styles.css
git commit -m "feat: 添加自用中工作区"
```

### 任务 5：全量验证与计划收尾

**文件：**
- 修改：`docs/superpowers/plans/2026-08-27-self-use-window.md`

- [ ] **步骤 1：运行定向测试**

运行：`npm test -- src/domain/self-use.test.ts src/components/AppShell.test.tsx src/features/self-use/SaleConfirmDialog.test.tsx src/pages/SelfUsePage.test.tsx`  
预期：所有定向测试 PASS。

- [ ] **步骤 2：运行完整质量检查**

运行：`npm run typecheck && npm run lint && npm test && npm run build`  
预期：全部命令退出码为 0。

- [ ] **步骤 3：勾选已完成计划并提交**

```bash
git add docs/superpowers/plans/2026-08-27-self-use-window.md
git commit -m "docs: 完成自用中工作区实施计划"
```

## 计划自检

- 规格中的导航、状态范围、macOS 风格、平衡字段、在售中操作、售出对话框、数据复用、错误处理、响应式与测试均映射到任务 1-5。
- 所有任务使用已定义的 `SELF_USE_STATUSES`、`createSaleInput`、`previewProfit`、`SelfUsePage`、`SelfUseList` 和 `SaleConfirmDialog`；没有未定义的接口。
- 范围明确排除了新增飞书字段、出售平台、图片、批量操作和撤销。
