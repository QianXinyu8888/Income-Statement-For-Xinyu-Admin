import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, type TransactionPage } from '../api/client';
import type { AnalyticsSummary } from '../domain/analytics';
import type { Transaction } from '../domain/transaction';
import { BrowserPreferencesProvider } from '../preferences/BrowserPreferencesContext';
import { PREFERENCES_STORAGE_KEY } from '../preferences/browser-preferences';
import TransactionsPage from './TransactionsPage';

const target: Transaction = {
  id: 'target',
  title: '目标产品',
  salePrice: 1200,
  costPrice: 500,
  shippingFee: 10,
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

function LocationSearch() {
  return <output aria-label="当前查询参数">{useLocation().search}</output>;
}

function renderPage(initialEntry = '/transactions?focus=target') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BrowserPreferencesProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <TransactionsPage />
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
    vi.spyOn(apiClient, 'summary').mockResolvedValue(summary);
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
    let resolveRefresh!: (page: TransactionPage) => void;
    const pendingRefresh = new Promise<TransactionPage>((resolve) => {
      resolveRefresh = resolve;
    });
    vi.spyOn(apiClient, 'transactions').mockImplementation((query) =>
      query.focusId ? Promise.resolve(focusedPage) : pendingRefresh,
    );
    const { container } = renderPage();

    await waitFor(() =>
      expect(apiClient.transactions).toHaveBeenCalledWith(
        expect.objectContaining({ focusId: 'target' }),
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
    expect(apiClient.transactions).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, focusId: undefined }),
    );
    await act(async () => resolveRefresh(focusedPage));
  });

  it('silently clears an invalid focused id without scrolling', async () => {
    vi.spyOn(apiClient, 'transactions').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      warnings: [],
    });
    renderPage('/transactions?focus=missing');

    await waitFor(() =>
      expect(apiClient.transactions).toHaveBeenLastCalledWith(
        expect.objectContaining({ focusId: undefined }),
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
      expect(apiClient.transactions).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'purchaseDate', order: 'desc' }),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: /筛选/ }));
    fireEvent.click(screen.getByRole('button', { name: '重置筛选' }));
    await waitFor(() =>
      expect(apiClient.transactions).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 20,
        sort: 'purchaseDate',
        order: 'desc',
      }),
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
    fireEvent.change(screen.getByLabelText('开始日期'), {
      target: { value: '2026-01-01' },
    });

    await waitFor(() =>
      expect(apiClient.transactions).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: '已售出',
          from: '2026-01-01',
        }),
      ),
    );
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
        reduceMotion: false,
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

    expect(await screen.findByRole('button', { name: '选择显示字段' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '商品名称' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '利润' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '交易状态' })).not.toBeInTheDocument();
    expect(container.querySelector('.mobile-list')).toHaveTextContent('利润+¥690.00');
    expect(container.querySelector('.mobile-list')).not.toHaveTextContent('交易状态已售出');
  });
});
