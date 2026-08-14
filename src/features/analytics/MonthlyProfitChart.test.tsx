import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MonthlyProfitChart } from './MonthlyProfitChart';

const monthly = Array.from({ length: 10 }, (_, index) => ({
  month: `2026-${String(index + 1).padStart(2, '0')}`,
  revenue: 1000,
  profit: index === 1 ? -500 : (index + 1) * 1000,
  count: 1,
}));

describe('MonthlyProfitChart', () => {
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
                contentRect: {
                  width: 840,
                  height: 330,
                },
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

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 13, 12));
  });

  afterAll(() => vi.unstubAllGlobals());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('keeps a wide series inside a local scroller', () => {
    render(<MonthlyProfitChart monthly={monthly} />);

    expect(screen.getByRole('img', { name: '月度利润趋势图' })).toBeInTheDocument();
    const scroll = screen.getByTestId('monthly-profit-scroll');
    const tooltipHost = screen.getByTestId('monthly-profit-tooltip-host');
    expect(scroll).toHaveClass('monthly-profit-chart__scroll');
    expect(scroll).not.toContainElement(tooltipHost);
    expect(screen.getByTestId('monthly-profit-canvas')).toHaveStyle({ width: '672px' });
  });

  it('places the current month first and fills missing months with zero profit', () => {
    const { container } = render(
      <MonthlyProfitChart
        monthly={[
          { month: '2026-06', revenue: 1000, profit: 300, count: 1 },
          { month: '2026-08', revenue: 2000, profit: 500, count: 2 },
        ]}
      />,
    );

    expect(
      [...container.querySelectorAll('.monthly-profit-chart__axis-tick')].map((tick) =>
        tick.textContent?.replace(/\s/g, ''),
      ),
    ).toEqual(['26年8月', '26年7月', '26年6月']);
    expect(screen.getByText('¥0')).toBeInTheDocument();
  });

  it('renders the current month as a compact two-line year-month tick', () => {
    render(<MonthlyProfitChart monthly={monthly} />);

    const currentTick = screen.getByTestId('current-month-tick');
    expect(currentTick).toHaveClass('is-current');
    expect(currentTick).toHaveTextContent('26年8月');
    expect(currentTick.querySelectorAll('tspan')).toHaveLength(2);
  });

  it('keeps a month with unavailable profit visible without inventing zero', () => {
    render(<MonthlyProfitChart monthly={[{ ...monthly[0], profit: null }]} />);

    expect(screen.queryByText('暂无可用利润数据')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('explains profit and loss colors without relying on the chart canvas', () => {
    render(
      <MonthlyProfitChart
        monthly={[
          { ...monthly[0], profit: 100 },
          { ...monthly[1], profit: -100 },
          { ...monthly[2], profit: 0 },
          { ...monthly[3], profit: 800 },
        ]}
      />,
    );

    expect(screen.getByText('盈利')).toBeInTheDocument();
    expect(screen.getByText('亏损')).toBeInTheDocument();
    expect(screen.getByTestId('profit-legend-swatch')).toHaveStyle({
      backgroundColor: 'var(--profit)',
    });
    expect(screen.getByTestId('loss-legend-swatch')).toHaveStyle({
      backgroundColor: 'var(--loss)',
    });
    const positiveLabel = screen.getByText('¥100');
    const negativeLabel = screen.getByText('-¥100');
    expect(Number(negativeLabel.getAttribute('y'))).toBeGreaterThan(
      Number(positiveLabel.getAttribute('y')),
    );
  });

  it('shows the selected month details while its bar is hovered', () => {
    const { container } = render(<MonthlyProfitChart monthly={monthly} />);

    const bar = container.querySelectorAll('.recharts-bar-rectangle')[5];
    expect(bar).toBeInTheDocument();
    fireEvent.mouseEnter(bar);

    const tooltipHost = screen.getByTestId('monthly-profit-tooltip-host');
    expect(tooltipHost).toHaveTextContent('2026 年 3 月');
    expect(tooltipHost).toHaveTextContent('盈利');
    expect(tooltipHost).toHaveTextContent('¥3,000.00');

    fireEvent.mouseLeave(screen.getByTestId('monthly-profit-scroll'));
    expect(tooltipHost).toBeEmptyDOMElement();
  });
});
