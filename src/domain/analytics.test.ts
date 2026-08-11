import { describe, expect, it } from 'vitest';
import { summarizeTransactions } from './analytics';
import type { Transaction } from './transaction';

const base: Transaction = {
  id: '1', title: '商品', category: '数码', salePrice: 1000, costPrice: 700,
  shippingFee: 10, profit: 290, profitRate: 290 / 700, status: '已售出',
  transactionDate: '2026-08-01', note: '',
};

describe('summarizeTransactions', () => {
  it('excludes self-use records from revenue and sold profit', () => {
    const summary = summarizeTransactions([
      base,
      { ...base, id: '2', salePrice: null, costPrice: 500, profit: -500, profitRate: null, status: '自用中' },
    ]);
    expect(summary.revenue).toBe(1000);
    expect(summary.profit).toBe(290);
    expect(summary.count).toBe(1);
  });

  it('groups monthly trend chronologically', () => {
    const summary = summarizeTransactions([
      base,
      { ...base, id: '2', transactionDate: '2026-07-01', salePrice: 500, profit: -50 },
    ]);
    expect(summary.monthly).toEqual([
      { month: '2026-07', revenue: 500, profit: -50, count: 1 },
      { month: '2026-08', revenue: 1000, profit: 290, count: 1 },
    ]);
  });
});
