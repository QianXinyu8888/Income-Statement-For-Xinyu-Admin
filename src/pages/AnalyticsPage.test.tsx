import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api/client';
import type { AnalyticsSummary } from '../domain/analytics';
import { BrowserPreferencesProvider } from '../preferences/BrowserPreferencesContext';
import AnalyticsPage from './AnalyticsPage';

const filteredSummary: AnalyticsSummary = {
  revenue: 1000,
  totalCost: 400,
  shipping: 10,
  profit: 600,
  roi: 1.5,
  count: 1,
  returnCount: 1,
  returnLoss: 45,
  incompleteCount: 0,
  monthly: [{ month: '2026-08', revenue: 500, profit: -100, count: 1 }],
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

const trendSummary: AnalyticsSummary = {
  ...filteredSummary,
  monthly: [
    { month: '2026-07', revenue: 1000, profit: 600, count: 1 },
    { month: '2026-08', revenue: 500, profit: -100, count: 1 },
  ],
};

function mockSummaries() {
  return vi
    .spyOn(apiClient, 'summary')
    .mockImplementation((from, to) => Promise.resolve(from || to ? filteredSummary : trendSummary));
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BrowserPreferencesProvider>
        <MemoryRouter>
          <AnalyticsPage />
        </MemoryRouter>
      </BrowserPreferencesProvider>
    </QueryClientProvider>,
  );
}

describe('AnalyticsPage drilldown', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly callback: ResizeObserverCallback) {}
        observe(target: Element) {
          this.callback(
            [
              {
                target,
                contentRect: { width: 620, height: 330 },
              } as ResizeObserverEntry,
            ],
            this,
          );
        }
        unobserve() {}
        disconnect() {}
      },
    );
  });
  afterAll(() => vi.unstubAllGlobals());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('expands product links, collapses them, and disables empty groups', async () => {
    mockSummaries();
    const user = userEvent.setup();
    const { container } = renderPage();

    const highYield = await screen.findByRole('button', { name: '高收益 1 笔' });
    expect(container.querySelectorAll('.analytics-stat-card')).toHaveLength(3);
    expect(container.querySelectorAll('.analytics-stat-card__title-mark')).toHaveLength(3);
    expect(screen.queryByRole('link', { name: '高收益产品' })).not.toBeInTheDocument();

    await user.click(highYield);
    expect(highYield).toHaveAttribute('aria-expanded', 'true');
    expect(highYield.closest('.drilldown-group')).toHaveClass('drilldown-group--expanded');
    const productLink = screen.getByRole('link', { name: '高收益产品' });
    expect(productLink).toHaveClass('drilldown-product');
    expect(productLink).toHaveAttribute('href', '/transactions?focus=record%2F1');
    expect(screen.getByText('1', { selector: '.drilldown-product__index' })).toHaveAttribute(
      'aria-hidden',
      'true',
    );

    await user.click(highYield);
    expect(highYield).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: '高收益产品' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '亏损 0 笔' })).toBeDisabled();
  });

  it('uses a fallback label for untitled products in status groups', async () => {
    mockSummaries();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: '在售中 1 笔' }));
    expect(screen.getByRole('link', { name: '未命名交易' })).toHaveAttribute(
      'href',
      '/transactions?focus=selling',
    );
  });

  it('renders the unfiltered multi-month trend without inventing aggregate columns', async () => {
    mockSummaries();
    const { container } = renderPage();

    expect(container.querySelector('.page')).toHaveClass('page--analytics');
    expect(await screen.findByRole('heading', { name: '月度利润' })).toBeInTheDocument();
    expect(screen.getByText('按月对比')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '月度利润趋势图' })).toBeInTheDocument();
    expect(screen.getByTestId('monthly-profit-scroll')).toBeInTheDocument();
    expect(screen.getByText('7月')).toBeInTheDocument();
    expect(screen.getByText('8月')).toBeInTheDocument();
    expect(screen.queryByText('占比')).not.toBeInTheDocument();
    expect(screen.queryByText('成交金额')).not.toBeInTheDocument();
  });

  it('queries the current month by default, remembers another month and resets to this month', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 7, 13, 12));
    const summarySpy = mockSummaries();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const first = renderPage();

    const monthTrigger = screen.getByRole('button', {
      name: '选择分析月份，当前为 2026 年 8 月',
    });
    await waitFor(() => {
      expect(summarySpy).toHaveBeenCalledWith('2026-08-01', '2026-08-31');
      expect(summarySpy).toHaveBeenCalledWith();
    });

    await user.click(monthTrigger);
    await user.click(screen.getByRole('button', { name: '选择 2026 年 2 月' }));
    await waitFor(() => expect(summarySpy).toHaveBeenCalledWith('2026-02-01', '2026-02-28'));
    expect(summarySpy.mock.calls.filter((args) => args.length === 0)).toHaveLength(1);
    first.unmount();

    renderPage();
    const rememberedMonth = screen.getByRole('button', {
      name: '选择分析月份，当前为 2026 年 2 月',
    });
    await user.click(rememberedMonth);
    await user.click(screen.getByRole('button', { name: '回到本月' }));
    expect(
      screen.getByRole('button', { name: '选择分析月份，当前为 2026 年 8 月' }),
    ).toBeVisible();
    await waitFor(() => expect(summarySpy).toHaveBeenCalledWith('2026-08-01', '2026-08-31'));
  });

  it('refetches when returning to the current month while it is already selected', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 7, 13, 12));
    const summarySpy = mockSummaries();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await waitFor(() =>
      expect(summarySpy).toHaveBeenCalledWith('2026-08-01', '2026-08-31'),
    );
    const countCurrentMonthCalls = () =>
      summarySpy.mock.calls.filter(
        ([from, to]) => from === '2026-08-01' && to === '2026-08-31',
      ).length;
    const callsBeforeReset = countCurrentMonthCalls();

    await user.click(
      screen.getByRole('button', { name: '选择分析月份，当前为 2026 年 8 月' }),
    );
    await user.click(screen.getByRole('button', { name: '回到本月' }));

    await waitFor(() => expect(countCurrentMonthCalls()).toBe(callsBeforeReset + 1));
  });
});
