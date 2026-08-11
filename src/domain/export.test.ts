import { describe, expect, it } from 'vitest';
import { buildCsv } from './export';
import type { Transaction } from './transaction';

describe('buildCsv', () => {
  it('exports real Feishu columns and escapes spreadsheet formulas', () => {
    const row: Transaction = {
      id: '1',
      title: '=HYPERLINK("bad")',
      salePrice: 10,
      costPrice: 5,
      shippingFee: 1,
      totalCost: 6,
      profit: 4,
      profitRate: 0.8,
      roi: 4 / 6,
      status: '已售出',
      purchaseDate: '2026-07-01',
      soldDate: '2026-08-01',
      holdingDays: 31,
      sortOrder: 1,
      note: '+cmd',
    };
    const csv = buildCsv([row]);
    expect(csv).toContain(
      '商品名称,交易状态,购入日期,售出日期,成交价,购入成本,运费,总成本,利润,ROI,持有天数,排序,备注',
    );
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+cmd");
  });
});
