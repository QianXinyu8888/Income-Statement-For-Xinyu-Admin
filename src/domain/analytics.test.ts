import { describe, expect, it } from 'vitest';
import { summarizeTransactions } from './analytics';
import type { Transaction } from './transaction';

const base: Transaction = {
  id: '1',
  title: '商品',
  salePrice: 1000,
  costPrice: 700,
  shippingFee: 10,
  totalCost: 710,
  profit: 290,
  profitRate: 290 / 700,
  roi: 290 / 710,
  status: '已售出',
  purchaseDate: '2026-07-01',
  soldDate: '2026-08-01',
  holdingDays: 31,
  sortOrder: null,
  note: '',
};

describe('summarizeTransactions', () => {
  it('excludes self-use records from revenue and sold profit', () => {
    const summary = summarizeTransactions([
      base,
      {
        ...base,
        id: '2',
        salePrice: null,
        costPrice: 500,
        totalCost: 500,
        profit: -500,
        profitRate: null,
        roi: null,
        status: '自用中',
        soldDate: null,
      },
    ]);
    expect(summary.revenue).toBe(1000);
    expect(summary.profit).toBe(290);
    expect(summary.count).toBe(1);
  });

  it('groups monthly trend by sold date', () => {
    const summary = summarizeTransactions([
      base,
      { ...base, id: '2', soldDate: '2026-07-01', salePrice: 500, profit: -50 },
    ]);
    expect(summary.monthly).toEqual([
      { month: '2026-07', revenue: 500, profit: -50, count: 1 },
      { month: '2026-08', revenue: 1000, profit: 290, count: 1 },
    ]);
  });
});
