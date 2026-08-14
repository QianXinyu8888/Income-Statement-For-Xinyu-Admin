import { describe, expect, it } from 'vitest';
import {
  buildMonthlyProfitData,
  completeMonthlyProfitMonths,
  formatCompactCny,
  getBarLabelY,
  getProfitDomain,
  getTooltipPosition,
} from './monthly-profit-chart';

describe('monthly profit chart helpers', () => {
  it('fills missing months backwards from the current month and excludes future data', () => {
    const result = completeMonthlyProfitMonths(
      [
        { month: '2025-12', revenue: 800, profit: 300, count: 1 },
        { month: '2026-02', revenue: 1000, profit: 500, count: 2 },
        { month: '2026-04', revenue: 2000, profit: 900, count: 3 },
        { month: '2026-05', revenue: 3000, profit: 1200, count: 4 },
      ],
      '2026-04',
    );

    expect(result.map(({ month, profit, count }) => ({ month, profit, count }))).toEqual([
      { month: '2026-04', profit: 900, count: 3 },
      { month: '2026-03', profit: 0, count: 0 },
      { month: '2026-02', profit: 500, count: 2 },
      { month: '2026-01', profit: 0, count: 0 },
      { month: '2025-12', profit: 300, count: 1 },
    ]);
  });

  it('returns the current month with zero profit when no valid history exists', () => {
    expect(completeMonthlyProfitMonths([], '2026-08')).toEqual([
      { month: '2026-08', revenue: 0, profit: 0, count: 0 },
    ]);
    expect(
      completeMonthlyProfitMonths(
        [{ month: 'invalid', revenue: 100, profit: 50, count: 1 }],
        '2026-08',
      ),
    ).toEqual([{ month: '2026-08', revenue: 0, profit: 0, count: 0 }]);
  });

  it('preserves an existing unavailable profit instead of inventing zero', () => {
    expect(
      completeMonthlyProfitMonths(
        [{ month: '2026-07', revenue: null, profit: null, count: 1 }],
        '2026-08',
      ),
    ).toEqual([
      { month: '2026-08', revenue: 0, profit: 0, count: 0 },
      { month: '2026-07', revenue: null, profit: null, count: 1 },
    ]);
  });

  it('formats bounded compact CNY labels', () => {
    expect(formatCompactCny(9600)).toBe('¥9,600');
    expect(formatCompactCny(12_400)).toBe('¥1.2 万');
    expect(formatCompactCny(-340_000_000)).toBe('-¥3.4 亿');
    expect(formatCompactCny(0)).toBe('¥0');
    expect(formatCompactCny(-0.4)).toBe('-¥0.4');
  });

  it('preserves the API month order and creates compact year-month labels', () => {
    const result = buildMonthlyProfitData(
      [
        { month: '2025-12', revenue: 1, profit: 1200, count: 1 },
        { month: '2026-07', revenue: 1, profit: -300, count: 1 },
        { month: '2026-08', revenue: 1, profit: 800, count: 1 },
        { month: '2026-02', revenue: 1, profit: Number.NaN, count: 1 },
        { month: '2026-03', revenue: 1, profit: null, count: 1 },
      ],
      '2026-08',
    );

    expect(
      result.map(({ month, yearLabel, monthLabel, isCurrentMonth }) => ({
        month,
        yearLabel,
        monthLabel,
        isCurrentMonth,
      })),
    ).toEqual([
      { month: '2025-12', yearLabel: '25年', monthLabel: '12月', isCurrentMonth: false },
      { month: '2026-07', yearLabel: '26年', monthLabel: '7月', isCurrentMonth: false },
      { month: '2026-08', yearLabel: '26年', monthLabel: '8月', isCurrentMonth: true },
    ]);
  });

  it('identifies the highest positive month without changing sign colors', () => {
    const result = buildMonthlyProfitData([
      { month: '2026-01', revenue: 1, profit: 200, count: 1 },
      { month: '2026-02', revenue: 1, profit: -500, count: 1 },
      { month: '2026-03', revenue: 1, profit: 800, count: 1 },
    ]);

    expect(result.map(({ sign, isHighestPositive }) => ({ sign, isHighestPositive }))).toEqual([
      { sign: 'positive', isHighestPositive: false },
      { sign: 'negative', isHighestPositive: false },
      { sign: 'positive', isHighestPositive: true },
    ]);
  });

  it('reserves fifteen percent on populated sides', () => {
    expect(getProfitDomain([100, 200])).toEqual([0, 230]);
    expect(getProfitDomain([-200, -100])).toEqual([-230, 0]);
    expect(getProfitDomain([-100, 200])).toEqual([-115, 230]);
    expect(getProfitDomain([0])).toEqual([-1, 1]);
  });

  it('places a negative label below a bar with signed height', () => {
    expect(getBarLabelY({ y: 250, height: -65, negative: true })).toBe(266);
  });

  it('anchors tooltips above bars and clamps them inside the visible chart', () => {
    expect(
      getTooltipPosition({
        barX: 4,
        barY: 180,
        barWidth: 34,
        barHeight: -70,
        canvasLeft: 0,
        canvasTop: 40,
        chartWidth: 335,
      }),
    ).toEqual({ left: 112, top: 140 });

    expect(
      getTooltipPosition({
        barX: 500,
        barY: 100,
        barWidth: 34,
        barHeight: 80,
        canvasLeft: -230,
        canvasTop: 40,
        chartWidth: 335,
      }),
    ).toEqual({ left: 223, top: 130 });
  });
});
