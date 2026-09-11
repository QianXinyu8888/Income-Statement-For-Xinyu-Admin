import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, type TransactionPage } from '../api/client';
import type { AnalyticsSummary } from '../domain/analytics';
import type { TransactionWorkspace } from '../domain/transaction-workspace';
import type { Transaction, TransactionStatus } from '../domain/transaction';
import { BrowserPreferencesProvider } from '../preferences/BrowserPreferencesContext';
import { PREFERENCES_STORAGE_KEY } from '../preferences/browser-preferences';
import TransactionsPage from './TransactionsPage';

const target: Transaction = {
  id: 'target',
  title: '目标产品',
  salePrice: 1200,
  costPrice: 500,
  purchaseShippingFee: 10,
  saleShippingFee: null,
  totalCost: 510,
  profit: 690,
  roi: 690 / 510,
  status: '已售出',
  purchaseDate: '2026-01-01',
  soldDate: '2026-08-01',
  holdingDays: 212,
  note: null,
};

const summary: AnalyticsSummary = {
  revenue: 1200,
  totalCost: 510,
  shipping: 10,
  profit: 690,
  roi: 690 / 510,
  count: 1,
  returnCount: 0,
  returnLoss: null,
  incompleteCount: 0,
  monthly: [],
  statuses: [],
  brackets: [],
  returnItems: [],
};

function workspace(items: Transaction[] = [target]): TransactionWorkspace {
  return {
    transactions: { items, total: items.length, page: 1, pageSize: 20 },
    summary,
    warnings: [],
  };
}

function LocationSearch() {
  return <output aria-label="当前查询参数">{useLocation().search}</output>;
}

function renderPage(
  initialEntry = '/transactions?focus=target',
  initialStatus?: TransactionStatus,
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BrowserPreferencesProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <TransactionsPage initialStatus={initialStatus} />
          <LocationSearch />
        </MemoryRouter>
      </BrowserPreferencesProvider>
    </QueryClientProvider>,
  );
}

describe('TransactionsPage focused navigation', () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(window, 'setTimeout');
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    vi.spyOn(apiClient, 'transactionWorkspace').mockResolvedValue(workspace());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    scrollIntoView.mockReset();
    localStorage.clear();
  });

  it('loads the target page, scrolls to the order, and clears highlighting after 1.5 seconds', async () => {
    const focusedPage: TransactionPage = {
      items: [target],
      total: 25,
      page: 2,
      pageSize: 20,
      warnings: [],
    };
    let resolveRefresh!: (value: TransactionWorkspace) => void;
    const pendingRefresh = new Promise<TransactionWorkspace>((resolve) => {
      resolveRefresh = resolve;
    });
    vi.spyOn(apiClient, 'transactionWorkspace').mockImplementation((query) =>
      query.focusId
        ? Promise.resolve({ ...workspace([target]), transactions: focusedPage })
        : pendingRefresh,
    );
    const { container } = renderPage();

    await waitFor(() =>
      expect(apiClient.transactionWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({ focusId: 'target' }),
        expect.any(Object),
      ),
    );
    const desktopTarget = await waitFor(() => {
      const element = container.querySelector('.desktop-list [data-transaction-id="target"]');
      expect(element).toHaveAttribute('data-focused', 'true');
      return element;
    });
    expect(desktopTarget).toBeInTheDocument();
    await waitFor(() =>
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('当前查询参数')).toBeEmptyDOMElement());

    expect(window.setTimeout).toHaveBeenCalledWith(expect.any(Function), 1500);
    await act(async () => vi.advanceTimersByTimeAsync(1500));

    const targetDuringRefresh = container.querySelector(
      '.desktop-list [data-transaction-id="target"]',
    );
    expect(targetDuringRefresh).toBeInTheDocument();
    expect(targetDuringRefresh).not.toHaveAttribute('data-focused');
    expect(apiClient.transactionWorkspace).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, focusId: undefined }),
      expect.any(Object),
    );
    await act(async () => resolveRefresh({ ...workspace([target]), transactions: focusedPage }));
  });

  it('loads the transaction list and monthly profit through one workspace request', async () => {
    vi.spyOn(apiClient, 'transactionWorkspace').mockResolvedValue(workspace());
    vi.spyOn(apiClient, 'transactions').mockRejectedValue(new Error('不应读取旧列表接口'));
    vi.spyOn(apiClient, 'summary').mockRejectedValue(new Error('不应读取旧汇总接口'));

    renderPage('/transactions');

    expect((await screen.findAllByText('目标产品')).length).toBeGreaterThan(0);
    expect(apiClient.transactionWorkspace).toHaveBeenCalledTimes(1);
    expect(apiClient.transactions).not.toHaveBeenCalled();
    expect(apiClient.summary).not.toHaveBeenCalled();
  });

  it('keeps the save drawer open until the single strict workspace reread finishes', async () => {
    const user = userEvent.setup();
    let resolveReread!: (value: TransactionWorkspace) => void;
    const reread = new Promise<TransactionWorkspace>((resolve) => {
      resolveReread = resolve;
    });
    const workspaceMock = vi
      .spyOn(apiClient, 'transactionWorkspace')
      .mockResolvedValueOnce(workspace())
      .mockReturnValueOnce(reread);
    vi.spyOn(apiClient, 'createTransaction').mockResolvedValue({ ...target, id: 'new-record' });
    renderPage('/transactions');

    await user.click(await screen.findByRole('button', { name: '新增交易' }));
    await user.type(screen.getByRole('textbox', { name: '商品名称' }), '新交易');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => expect(apiClient.createTransaction).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('交易已保存')).not.toBeInTheDocument();
    expect(workspaceMock).toHaveBeenCalledTimes(2);

    await act(async () =>
      resolveReread(workspace([{ ...target, id: 'new-record', title: '新交易' }])),
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('交易已保存')).toBeInTheDocument();
  });

  it('silently clears an invalid focused id without scrolling', async () => {
    vi.spyOn(apiClient, 'transactionWorkspace').mockResolvedValue(workspace([]));
    renderPage('/transactions?focus=missing');

    await waitFor(() =>
      expect(apiClient.transactionWorkspace).toHaveBeenLastCalledWith(
        expect.objectContaining({ focusId: undefined }),
        expect.any(Object),
      ),
    );
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getByLabelText('当前查询参数')).toBeEmptyDOMElement();
  });

  it('uses descending order by default and restores it when filters reset', async () => {
    vi.spyOn(apiClient, 'transactions').mockResolvedValue({
      items: [target],
      total: 1,
      page: 1,
      pageSize: 20,
      warnings: [],
    });
    renderPage('/transactions');

    await waitFor(() =>
      expect(apiClient.transactionWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'purchaseDate', order: 'desc' }),
        expect.any(Object),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: '重置筛选' }));
    await waitFor(() =>
      expect(apiClient.transactionWorkspace).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 20,
          dateField: 'purchaseDate',
          sort: 'purchaseDate',
          order: 'desc',
        }),
        expect.any(Object),
      ),
    );
  });

  it('opens the pending-receipt shortcut with the matching status filter', async () => {
    vi.spyOn(apiClient, 'transactions').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      warnings: [],
    });

    renderPage('/pending-receipt', '待收货');

    await waitFor(() =>
      expect(apiClient.transactionWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({ status: '待收货' }),
        expect.any(Object),
      ),
    );
  });

  it('keeps status and date boundary reachable directly from toolbar', async () => {
    vi.spyOn(apiClient, 'transactions').mockResolvedValue({
      items: [target],
      total: 1,
      page: 1,
      pageSize: 20,
      warnings: [],
    });
    renderPage('/transactions');

    fireEvent.change(screen.getByRole('combobox', { name: '状态' }), {
      target: { value: '已售出' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: '日期类型' }), {
      target: { value: 'soldDate' },
    });
    fireEvent.change(screen.getByLabelText('售出日期开始'), {
      target: { value: '2026-01-01' },
    });
    fireEvent.change(screen.getByLabelText('售出日期结束'), {
      target: { value: '2026-08-01' },
    });

    await waitFor(() =>
      expect(apiClient.transactionWorkspace).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: '已售出',
          dateField: 'soldDate',
          from: '2026-01-01',
          to: '2026-08-01',
        }),
        expect.any(Object),
      ),
    );
  });

  it('sends the product name search to the transaction query', async () => {
    vi.spyOn(apiClient, 'transactions').mockResolvedValue({
      items: [target],
      total: 1,
      page: 1,
      pageSize: 20,
      warnings: [],
    });
    const user = userEvent.setup();
    renderPage('/transactions');

    const input = screen.getByRole('textbox', { name: '搜索交易' });
    await user.type(input, '目标产品');
    await user.click(screen.getByRole('button', { name: '开始搜索' }));

    await waitFor(() =>
      expect(apiClient.transactionWorkspace).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: '目标产品', page: 1 }),
        expect.any(Object),
      ),
    );
  });

  it('opens a mobile filter sheet without hiding the current filter controls from the page', async () => {
    vi.spyOn(apiClient, 'transactions').mockResolvedValue({
      items: [target],
      total: 1,
      page: 1,
      pageSize: 20,
      warnings: [],
    });
    const user = userEvent.setup();
    renderPage('/transactions');

    await user.click(screen.getByRole('button', { name: '打开筛选条件' }));

    const sheet = screen.getByRole('region', { name: '筛选交易' });
    expect(within(sheet).getByRole('combobox', { name: '状态' })).toBeInTheDocument();
    expect(within(sheet).getByRole('combobox', { name: '日期类型' })).toBeInTheDocument();
    expect(within(sheet).getByLabelText('购入日期开始')).toBeInTheDocument();
    expect(within(sheet).getByLabelText('购入日期结束')).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: '关闭筛选条件' }));
    expect(screen.queryByRole('region', { name: '筛选交易' })).not.toBeInTheDocument();
  });

  it('marks the transaction page for stable mobile animation rules', () => {
    vi.spyOn(apiClient, 'transactions').mockResolvedValue({
      items: [target],
      total: 1,
      page: 1,
      pageSize: 20,
      warnings: [],
    });

    const { container } = renderPage('/transactions');

    expect(container.querySelector('section.page')).toHaveClass('page--transactions');
  });

  it('gives batch status actions explicit accessible names', async () => {
    vi.spyOn(apiClient, 'transactions').mockResolvedValue({
      items: [target],
      total: 1,
      page: 1,
      pageSize: 20,
      warnings: [],
    });
    renderPage('/transactions');

    const checkboxes = await screen.findAllByRole('checkbox', { name: '选择 目标产品' });
    fireEvent.click(checkboxes[0]);

    expect(screen.getByText('已选择 1 项')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '标记在售中' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '标记已售出' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除所选交易' })).toBeInTheDocument();
  });

  it('opens an editable list field and focuses its matching drawer control', async () => {
    vi.spyOn(apiClient, 'transactions').mockResolvedValue({
      items: [target],
      total: 1,
      page: 1,
      pageSize: 20,
      warnings: [],
    });
    renderPage('/transactions');

    const statusFields = await screen.findAllByRole('button', {
      name: '编辑交易状态：已售出',
    });
    fireEvent.click(statusFields[0]);

    const dialog = await screen.findByRole('dialog');
    await waitFor(() =>
      expect(within(dialog).getByRole('combobox', { name: '状态' })).toHaveFocus(),
    );
  });

  it('restores the same stored field preferences in desktop and mobile lists', async () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        themeMode: 'system',
        visibleTransactionFields: ['title', 'profit'],
        analysisMonth: '2026-08',
      }),
    );
    vi.spyOn(apiClient, 'transactions').mockResolvedValue({
      items: [target],
      total: 1,
      page: 1,
      pageSize: 20,
      warnings: [],
    });

    const { container } = renderPage('/transactions');

    expect(await screen.findByRole('button', { name: '自定义显示字段' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '商品名称' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '利润' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '交易状态' })).not.toBeInTheDocument();
    expect(container.querySelector('.mobile-list')).toHaveTextContent('利润+¥690.00');
    expect(container.querySelector('.mobile-list')).not.toHaveTextContent('交易状态已售出');
  });
});
