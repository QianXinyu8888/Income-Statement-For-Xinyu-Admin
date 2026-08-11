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
});
