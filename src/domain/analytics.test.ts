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
  roi: 290 / 710,
  status: '已售出',
  purchaseDate: '2026-07-01',
  soldDate: '2026-08-01',
  holdingDays: 31,
  sortOrder: null,
  note: null,
};

describe('summarizeTransactions', () => {
  it('separates sold profit from returns and counts incomplete sold records', () => {
    const summary = summarizeTransactions([
      base,
      {
        ...base,
        id: '2',
        salePrice: null,
        totalCost: null,
        profit: null,
        roi: null,
        soldDate: null,
      },
      {
        ...base,
        id: '3',
        status: '已退货',
        salePrice: 500,
        totalCost: 545,
        profit: -45,
        roi: -45 / 545,
      },
      { ...base, id: '4', status: '在售中', salePrice: null, profit: null, roi: null },
    ]);
    expect(summary.count).toBe(2);
    expect(summary.revenue).toBe(1000);
    expect(summary.totalCost).toBe(710);
    expect(summary.profit).toBe(290);
    expect(summary.roi).toBeCloseTo(290 / 710);
    expect(summary.returnCount).toBe(1);
    expect(summary.returnLoss).toBe(45);
    expect(summary.incompleteCount).toBe(1);
  });

  it('returns null totals when no real amount exists', () => {
    const summary = summarizeTransactions([
      {
        ...base,
        salePrice: null,
        costPrice: null,
        shippingFee: null,
        totalCost: null,
        profit: null,
        roi: null,
        soldDate: null,
      },
    ]);
    expect(summary.revenue).toBeNull();
    expect(summary.totalCost).toBeNull();
    expect(summary.shipping).toBeNull();
    expect(summary.profit).toBeNull();
    expect(summary.roi).toBeNull();
    expect(summary.returnLoss).toBeNull();
  });

  it('groups monthly trend only by real sold dates and amounts', () => {
    const summary = summarizeTransactions([
      base,
      { ...base, id: '2', soldDate: '2026-07-01', salePrice: 500, profit: -50 },
      { ...base, id: '3', soldDate: null, salePrice: 400, profit: 20 },
    ]);
    expect(summary.monthly).toEqual([
      { month: '2026-07', revenue: 500, profit: -50, count: 1 },
      { month: '2026-08', revenue: 1000, profit: 290, count: 1 },
    ]);
  });
});
