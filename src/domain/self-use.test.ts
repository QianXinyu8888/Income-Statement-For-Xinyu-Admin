import { describe, expect, it } from 'vitest';
import type { Transaction } from './transaction';
import { createSaleInput, getSelfUseRecords, previewProfit } from './self-use';

const personal: Transaction = {
  id: 'personal',
  title: '耳机',
  salePrice: null,
  costPrice: 900,
  shippingFee: 20,
  totalCost: 920,
  profit: null,
  roi: null,
  status: '自用中',
  purchaseDate: '2026-05-01',
  soldDate: null,
  holdingDays: 50,
  note: '已有备注',
};

const listed: Transaction = {
  ...personal,
  id: 'listed',
  title: '键盘',
  status: '在售中',
  holdingDays: 120,
};

const sold: Transaction = {
  ...personal,
  id: 'sold',
  title: '显示器',
  status: '已售出',
  holdingDays: 240,
};

describe('self-use workspace helpers', () => {
  it('keeps only self-use and listed records and orders them by the selected field', () => {
    expect(getSelfUseRecords([personal, sold, listed], 'holdingDays', 'desc')).toEqual([
      listed,
      personal,
    ]);
  });

  it('can narrow active records to one status', () => {
    expect(getSelfUseRecords([personal, listed], 'purchaseDate', 'desc', '在售中')).toEqual([listed]);
  });

  it('preserves non-sale fields when creating a sold update', () => {
    expect(
      createSaleInput(personal, {
        salePrice: 1200,
        soldDate: '2026-08-27',
        note: '面交',
      }),
    ).toEqual({
      title: '耳机',
      salePrice: 1200,
      costPrice: 900,
      shippingFee: 20,
      status: '已售出',
      purchaseDate: '2026-05-01',
      soldDate: '2026-08-27',
      note: '面交',
    });
  });

  it('calculates sale profit only when both price and total cost exist', () => {
    expect(previewProfit(1200, 920)).toBe(280);
    expect(previewProfit(1200, null)).toBeNull();
  });
});
