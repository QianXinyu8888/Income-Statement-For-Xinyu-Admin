import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, type TransactionPage } from '../api/client';
import type { AnalyticsSummary } from '../domain/analytics';
import type { Transaction } from '../domain/transaction';
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
  sortOrder: null,
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
      <MemoryRouter initialEntries={[initialEntry]}>
        <TransactionsPage />
        <LocationSearch />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TransactionsPage focused navigation', () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
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
  });

  it('loads the target page, scrolls to the order, and clears highlighting after one second', async () => {
    vi.spyOn(apiClient, 'transactions').mockImplementation(async (query) => {
      const page: TransactionPage = {
        items: [target],
        total: 25,
        page: query.focusId ? 2 : query.page,
        pageSize: 20,
        warnings: [],
      };
      return page;
    });
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
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('当前查询参数')).toBeEmptyDOMElement());

    await act(async () => vi.advanceTimersByTimeAsync(1000));

    await waitFor(() =>
      expect(
        container.querySelector('.desktop-list [data-transaction-id="target"]'),
      ).not.toHaveAttribute('data-focused'),
    );
    expect(apiClient.transactions).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, focusId: undefined }),
    );
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
});
