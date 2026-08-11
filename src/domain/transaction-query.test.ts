import { describe, expect, it } from 'vitest';
import type { Transaction } from './transaction';
import { queryTransactions } from './transaction-query';

function record(index: number): Transaction {
  return {
    id: `record-${index}`,
    title: index === 4 ? '目标相机' : `产品 ${index}`,
    salePrice: 1000 + index,
    costPrice: 500,
    shippingFee: 10,
    totalCost: 510,
    profit: 490 + index,
    roi: (490 + index) / 510,
    status: index === 4 ? '在售中' : '已售出',
    purchaseDate: '2026-01-01',
    soldDate: `2026-08-${String(index).padStart(2, '0')}`,
    holdingDays: index,
    sortOrder: index,
    note: null,
  };
}

describe('queryTransactions', () => {
  it('returns the page containing a focused transaction after Feishu ordering', () => {
    const records = Array.from({ length: 25 }, (_, index) => record(index + 1));
    const result = queryTransactions(records, {
      page: 1,
      pageSize: 20,
      sort: 'sortOrder',
      order: 'asc',
      focusId: 'record-22',
    });

    expect(result.page).toBe(2);
    expect(result.items.some(({ id }) => id === 'record-22')).toBe(true);
    expect(records[0].id).toBe('record-1');
  });

  it('sorts by the Feishu order field ascending with nulls last and stable ties', () => {
    const records = [
      { ...record(4), sortOrder: null },
      { ...record(2), sortOrder: 1 },
      { ...record(3), sortOrder: null },
      { ...record(1), sortOrder: 1 },
    ];

    const result = queryTransactions(records, {
      page: 1,
      pageSize: 20,
      sort: 'sortOrder',
      order: 'asc',
    });

    expect(result.items.map(({ id }) => id)).toEqual([
      'record-2',
      'record-1',
      'record-4',
      'record-3',
    ]);
  });

  it('keeps the requested page when the focused id does not exist', () => {
    const result = queryTransactions(
      Array.from({ length: 25 }, (_, index) => record(index + 1)),
      {
        page: 2,
        pageSize: 20,
        sort: 'soldDate',
        order: 'desc',
        focusId: 'missing',
      },
    );

    expect(result.page).toBe(2);
    expect(result.items).toHaveLength(5);
  });

  it('preserves the existing text, status, and date filtering behavior', () => {
    const result = queryTransactions([record(3), record(4), record(5)], {
      page: 1,
      pageSize: 20,
      q: '相机',
      status: '在售中',
      from: '2026-08-04',
      to: '2026-08-04',
      sort: 'title',
      order: 'asc',
    });

    expect(result.items.map(({ id }) => id)).toEqual(['record-4']);
    expect(result.total).toBe(1);
  });
});
