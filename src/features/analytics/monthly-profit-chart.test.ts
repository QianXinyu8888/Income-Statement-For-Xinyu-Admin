import { describe, expect, it } from 'vitest';
import {
  buildMonthlyProfitData,
  formatCompactCny,
  getBarLabelY,
  getProfitDomain,
} from './monthly-profit-chart';

describe('monthly profit chart helpers', () => {
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
});
