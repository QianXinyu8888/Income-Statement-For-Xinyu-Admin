import { describe, expect, it } from 'vitest';
import { buildCsv } from './export';
import type { Transaction } from './transaction';

describe('buildCsv', () => {
  it('escapes spreadsheet formulas and preserves Chinese headers', () => {
    const row: Transaction = {
      id: '1', title: '=HYPERLINK("bad")', category: '数码', salePrice: 10,
      costPrice: 5, shippingFee: 1, profit: 4, profitRate: 0.8,
      status: '已售出', transactionDate: '2026-08-01', note: '+cmd',
    };
    const csv = buildCsv([row]);
    expect(csv).toContain('商品名称,分类,售价,成本,运费,利润,利润率,状态,日期,备注');
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+cmd");
  });
});
