import { describe, expect, it } from 'vitest';
import { analysisMonthBounds } from './analysis-month';

describe('analysisMonthBounds', () => {
  it.each([
    ['2026-01', { from: '2026-01-01', to: '2026-01-31' }],
    ['2026-04', { from: '2026-04-01', to: '2026-04-30' }],
    ['2024-02', { from: '2024-02-01', to: '2024-02-29' }],
    ['2025-02', { from: '2025-02-01', to: '2025-02-28' }],
  ])('converts %s to local calendar bounds', (month, expected) => {
    expect(analysisMonthBounds(month)).toEqual(expected);
  });

  it('throws for an invalid month so callers cannot issue an ambiguous query', () => {
    expect(() => analysisMonthBounds('2026-13')).toThrow('Invalid analysis month');
  });
});
