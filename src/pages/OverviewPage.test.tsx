import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api/client';
import type { AnalyticsSummary } from '../domain/analytics';
import OverviewPage from './OverviewPage';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const summary: AnalyticsSummary = {
  revenue: 331778.45,
  totalCost: 316064.31,
  shipping: 100,
  profit: 21764.14,
  roi: 0.069,
  count: 155,
  returnCount: 10,
  returnLoss: 330,
  incompleteCount: 65,
  monthly: [{ month: '2026-08', revenue: 1000, profit: 21764.14, count: 2 }],
  statuses: [],
  brackets: [],
  returnItems: [],
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OverviewPage />
    </QueryClientProvider>,
  );
}

describe('OverviewPage', () => {
  it('renders real metrics with profit as the primary semantic metric', async () => {
    vi.spyOn(apiClient, 'summary').mockResolvedValue(summary);
    const { container } = renderPage();

    expect(await screen.findByText('销售额')).toBeInTheDocument();
    for (const label of ['总成本', '利润', 'ROI', '成交笔数']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(container.querySelector('.metric--profit')).toHaveTextContent('¥21,764.14');
    expect(screen.getByRole('status')).toHaveTextContent('65 条已售出记录字段不完整');
    expect(screen.getByText('月度利润')).toBeInTheDocument();
  });

  it('isolates the monthly chart layout from generic chart styles', async () => {
    vi.spyOn(apiClient, 'summary').mockResolvedValue(summary);
    renderPage();

    const heading = await screen.findByRole('heading', { name: '月度利润' });
    expect(heading.closest('section')).toHaveClass('overview-monthly-chart');
  });
  it('marks negative profit bars and provides accessible img roles', async () => {
    vi.spyOn(apiClient, 'summary').mockResolvedValue({
      ...summary,
      monthly: [{ month: '2026-07', revenue: 500, profit: -210, count: 1 }],
    });
    const { container } = renderPage();

    expect(await screen.findByText('2026.07')).toBeInTheDocument();
    expect(screen.getByText('-¥210.00')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '2026-07 利润：-¥210.00' })).toBeInTheDocument();
    expect(container.querySelector('.simple-chart__plot')).toHaveAttribute(
      'data-direction',
      'negative',
    );
  });

  it('sorts monthly trend in chronological order (oldest to newest)', async () => {
    vi.spyOn(apiClient, 'summary').mockResolvedValue({
      ...summary,
      monthly: [
        { month: '2026-08', revenue: 1000, profit: 500, count: 2 },
        { month: '2026-06', revenue: 800, profit: 300, count: 1 },
      ],
    });
    renderPage();

    const monthLabels = await screen.findAllByText(/2026\./);
    expect(monthLabels[0]).toHaveTextContent('2026.06');
    expect(monthLabels[1]).toHaveTextContent('2026.08');
  });

  it('handles invalid month formats safely without crashing', async () => {
    vi.spyOn(apiClient, 'summary').mockResolvedValue({
      ...summary,
      monthly: [{ month: 'invalid', revenue: 500, profit: 100, count: 1 }],
    });
    renderPage();

    expect(await screen.findByText('invalid')).toBeInTheDocument();
  });
});
