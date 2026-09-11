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
      purchaseShippingFee: 1,
      saleShippingFee: 0,
      totalCost: 6,
      profit: 4,
      roi: 4 / 6,
      status: '已售出',
      purchaseDate: '2026-07-01',
      soldDate: '2026-08-01',
      holdingDays: 31,
      note: '+cmd',
    };
    const csv = buildCsv([row]);
    expect(csv).toContain(
      '商品名称,交易状态,购入日期,售出日期,成交价,购入成本,购入运费,售出运费,总成本,利润,ROI,持有天数,备注',
    );
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+cmd");
  });

  it('leaves missing Feishu values as empty cells', () => {
    const row: Transaction = {
      id: '2',
      title: '待补记录',
      salePrice: null,
      costPrice: null,
      purchaseShippingFee: null,
      saleShippingFee: null,
      totalCost: null,
      profit: null,
      roi: null,
      status: '在售中',
      purchaseDate: null,
      soldDate: null,
      holdingDays: null,
      note: null,
    };
    const csv = buildCsv([row]);
    expect(csv).not.toContain('undefined');
    expect(csv).not.toContain('null');
    expect(csv.split('\r\n')[1]?.split(',')).toHaveLength(13);
  });
});
