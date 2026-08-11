import { describe, expect, it } from 'vitest';
import { fromFeishuRecord, toFeishuFields, transactionSchema } from './transaction';

describe('transaction domain', () => {
  it('maps every field from the real Feishu schema', () => {
    const result = fromFeishuRecord({
      record_id: 'rec-1',
      fields: {
        商品名称: 'iPhone 15 Pro',
        '成交价(¥)': 5200,
        '购入成本(¥)': 4100,
        '运费(¥)': 18,
        '总成本(¥)': 4118,
        '利润(¥)': '1082',
        ROI: 0.2639,
        交易状态: ['已售出'],
        购入日期: 1775232000000,
        售出日期: 1785600000000,
        持有天数: 120,
        排序: 1,
        备注: '自提',
      },
    });
    expect(result).toMatchObject({
      id: 'rec-1',
      title: 'iPhone 15 Pro',
      salePrice: 5200,
      costPrice: 4100,
      shippingFee: 18,
      totalCost: 4118,
      profit: 1082,
      roi: 0.2639,
      status: '已售出',
      purchaseDate: '2026-04-04',
      soldDate: '2026-08-02',
      holdingDays: 120,
      sortOrder: 1,
      note: '自提',
    });
  });

  it('rejects a truly unknown status', () => {
    expect(() =>
      fromFeishuRecord({
        record_id: 'rec-2',
        fields: {
          商品名称: '商品',
          交易状态: ['交易中'],
          购入日期: 1785600000000,
        },
      }),
    ).toThrow('未知交易状态');
  });

  it('maps an on-sale record without a sold date', () => {
    const result = fromFeishuRecord({
      record_id: 'rec-3',
      fields: {
        商品名称: '在售商品',
        交易状态: ['在售中'],
        购入日期: 1785600000000,
        '购入成本(¥)': 100,
        '运费(¥)': 0,
      },
    });
    expect(result.status).toBe('在售中');
    expect(result.soldDate).toBeNull();
  });

  it('allows self-use without sale price and sold date', () => {
    expect(
      transactionSchema.parse({
        title: 'MacBook Air',
        salePrice: null,
        costPrice: 5000,
        shippingFee: 0,
        status: '自用中',
        purchaseDate: '2026-08-10',
        soldDate: null,
        note: '',
        sortOrder: null,
      }).salePrice,
    ).toBeNull();
  });

  it('writes only writable fields from the real Feishu schema', () => {
    expect(
      toFeishuFields({
        title: 'AirPods Pro',
        salePrice: 900,
        costPrice: 650,
        shippingFee: 12,
        status: '已售出',
        purchaseDate: '2026-07-01',
        soldDate: '2026-08-09',
        note: '顺丰',
        sortOrder: 2,
      }),
    ).toEqual({
      商品名称: 'AirPods Pro',
      '成交价(¥)': 900,
      '购入成本(¥)': 650,
      '运费(¥)': 12,
      交易状态: '已售出',
      购入日期: expect.any(Number),
      售出日期: expect.any(Number),
      排序: 2,
      备注: '顺丰',
    });
  });
});
