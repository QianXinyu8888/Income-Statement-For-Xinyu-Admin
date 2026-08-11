import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api/client';
import type { AnalyticsSummary } from '../domain/analytics';
import AnalyticsPage from './AnalyticsPage';

const summary: AnalyticsSummary = {
  revenue: 1000,
  totalCost: 400,
  shipping: 10,
  profit: 600,
  roi: 1.5,
  count: 1,
  returnCount: 1,
  returnLoss: 45,
  incompleteCount: 0,
  monthly: [{ month: '2026-08', revenue: 1000, profit: 600, count: 1 }],
  brackets: [
    {
      name: '高收益',
      count: 1,
      items: [{ id: 'record/1', title: '高收益产品' }],
    },
    { name: '稳健盈利', count: 0, items: [] },
    { name: '平价回血', count: 0, items: [] },
    { name: '亏损', count: 0, items: [] },
  ],
  statuses: [
    {
      status: '已售出',
      count: 1,
      items: [{ id: 'record/1', title: '高收益产品' }],
    },
    { status: '在售中', count: 1, items: [{ id: 'selling', title: null }] },
  ],
  returnItems: [{ id: 'returned', title: '退货产品' }],
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AnalyticsPage drilldown', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });
  afterAll(() => vi.unstubAllGlobals());
  afterEach(() => vi.restoreAllMocks());

  it('expands product links, collapses them, and disables empty groups', async () => {
    vi.spyOn(apiClient, 'summary').mockResolvedValue(summary);
    const user = userEvent.setup();
    renderPage();

    const highYield = await screen.findByRole('button', { name: '高收益 1 笔' });
    expect(screen.queryByRole('link', { name: '高收益产品' })).not.toBeInTheDocument();

    await user.click(highYield);
    expect(highYield).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: '高收益产品' })).toHaveAttribute(
      'href',
      '/transactions?focus=record%2F1',
    );

    await user.click(highYield);
    expect(highYield).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: '高收益产品' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '亏损 0 笔' })).toBeDisabled();
  });

  it('uses a fallback label for untitled products in status groups', async () => {
    vi.spyOn(apiClient, 'summary').mockResolvedValue(summary);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: '在售中 1 笔' }));
    expect(screen.getByRole('link', { name: '未命名交易' })).toHaveAttribute(
      'href',
      '/transactions?focus=selling',
    );
  });
});
