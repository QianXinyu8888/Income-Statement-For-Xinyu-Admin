import { describe, expect, it } from 'vitest';
import { fromFeishuRecord, toFeishuFields, transactionSchema } from './transaction';

describe('transaction domain', () => {
  it('maps a Feishu record into the canonical model and calculates profit', () => {
    const result = fromFeishuRecord({
      record_id: 'rec-1',
      fields: {
        商品名称: 'iPhone 15 Pro',
        '成交价(¥)': 5200,
        '购入成本(¥)': 4100,
        '运费(¥)': 18,
        交易状态: '已售出',
        交易日期: 1786320000000,
        品类: '手机',
        备注: '自提',
      },
    });

    expect(result).toMatchObject({
      id: 'rec-1',
      title: 'iPhone 15 Pro',
      salePrice: 5200,
      costPrice: 4100,
      shippingFee: 18,
      profit: 1082,
      status: '已售出',
      category: '手机',
    });
    expect(result.profitRate).toBeCloseTo(1082 / 4100);
    expect(result.transactionDate).toMatch(/^2026-08-/);
  });

  it('rejects unknown statuses instead of inventing a default', () => {
    expect(() =>
      fromFeishuRecord({ record_id: 'rec-2', fields: { 商品名称: '商品', 交易状态: '交易中' } }),
    ).toThrow('未知交易状态');
  });

  it('allows a self-use record without a sale price', () => {
    const parsed = transactionSchema.parse({
      title: 'MacBook Air',
      category: '电脑',
      salePrice: null,
      costPrice: 5000,
      shippingFee: 0,
      status: '自用中',
      transactionDate: '2026-08-10',
      note: '',
    });
    expect(parsed.salePrice).toBeNull();
  });

  it('writes only known Feishu fields', () => {
    expect(
      toFeishuFields({
        title: 'AirPods Pro',
        category: '耳机',
        salePrice: 900,
        costPrice: 650,
        shippingFee: 12,
        status: '已售出',
        transactionDate: '2026-08-09',
        note: '顺丰',
      }),
    ).toEqual({
      商品名称: 'AirPods Pro',
      品类: '耳机',
      '成交价(¥)': 900,
      '购入成本(¥)': 650,
      '运费(¥)': 12,
      交易状态: '已售出',
      交易日期: expect.any(Number),
      备注: '顺丰',
    });
  });
});
