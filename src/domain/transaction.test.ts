import { describe, expect, it } from 'vitest';
import {
  fromFeishuRecord,
  mapFeishuRecord,
  toFeishuFields,
  transactionSchema,
} from './transaction';

describe('transaction domain', () => {
  it('maps every field from the real Feishu schema', () => {
    const result = fromFeishuRecord({
      record_id: 'rec-1',
      fields: {
        商品名称: 'iPhone 15 Pro',
        '成交价(¥)': 5200,
        '购入成本(¥)': 4100,
        '购入运费(¥)': 18,
        '售出运费(¥)': 6,
        '总成本(¥)': 4118,
        '利润(¥)': '1082',
        ROI: 0.2639,
        交易状态: ['已售出'],
        购入日期: 1775232000000,
        售出日期: 1785600000000,
        持有天数: 120,
        备注: '自提',
      },
    });
    expect(result).toMatchObject({
      id: 'rec-1',
      title: 'iPhone 15 Pro',
      salePrice: 5200,
      costPrice: 4100,
      purchaseShippingFee: 18,
      saleShippingFee: 6,
      totalCost: 4118,
      profit: 1082,
      roi: 0.2639,
      status: '已售出',
      purchaseDate: '2026-04-04',
      soldDate: '2026-08-02',
      holdingDays: 120,
      note: '自提',
    });
    expect(result).not.toHaveProperty('sortOrder');
  });

  it('keeps missing Feishu values null without inventing defaults', () => {
    const { transaction, warnings } = mapFeishuRecord({
      record_id: 'rec-empty',
      fields: { 商品名称: '待补记录', 交易状态: ['已售出'] },
    });
    expect(transaction).toMatchObject({
      salePrice: null,
      costPrice: null,
      purchaseShippingFee: null,
      saleShippingFee: null,
      totalCost: null,
      profit: null,
      roi: null,
      purchaseDate: null,
      soldDate: null,
      holdingDays: null,
    });
    expect(warnings).toEqual([]);
  });

  it('returns an unknown status as null with a warning', () => {
    const result = mapFeishuRecord({
      record_id: 'rec-2',
      fields: { 商品名称: '商品', 交易状态: ['交易中'] },
    });
    expect(result.transaction.status).toBeNull();
    expect(result.warnings[0]).toContain('未知交易状态');
  });

  it('maps an on-sale record without a sold date', () => {
    const result = fromFeishuRecord({
      record_id: 'rec-3',
      fields: {
        商品名称: '在售商品',
        交易状态: ['在售中'],
        购入日期: 1785600000000,
        '购入成本(¥)': 100,
        '购入运费(¥)': 0,
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
        costPrice: null,
        purchaseShippingFee: null,
        saleShippingFee: null,
        status: '自用中',
        purchaseDate: null,
        soldDate: null,
        note: '',
      }).salePrice,
    ).toBeNull();
  });

  it('writes only writable fields from the real Feishu schema', () => {
    expect(
      toFeishuFields({
        title: 'AirPods Pro',
        salePrice: 900,
        costPrice: 650,
        purchaseShippingFee: 12,
        saleShippingFee: 8,
        status: '已售出',
        purchaseDate: '2026-07-01',
        soldDate: '2026-08-09',
        note: '顺丰',
      }),
    ).toEqual({
      商品名称: 'AirPods Pro',
      '成交价(¥)': 900,
      '购入成本(¥)': 650,
      '购入运费(¥)': 12,
      '售出运费(¥)': 8,
      交易状态: '已售出',
      购入日期: expect.any(Number),
      售出日期: expect.any(Number),
      备注: '顺丰',
    });
  });

  it('allows optional writable fields to remain null', () => {
    expect(
      toFeishuFields({
        title: '待补商品',
        status: '在售中',
        salePrice: null,
        costPrice: null,
        purchaseShippingFee: null,
        saleShippingFee: null,
        purchaseDate: null,
        soldDate: null,
        note: null,
      }),
    ).toMatchObject({
      '成交价(¥)': null,
      '购入成本(¥)': null,
      '购入运费(¥)': null,
      '售出运费(¥)': null,
      购入日期: null,
      售出日期: null,
    });
  });
});
