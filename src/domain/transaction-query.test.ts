import { describe, expect, it } from 'vitest';
import type { Transaction } from './transaction';
import { queryTransactions } from './transaction-query';

function record(index: number): Transaction {
  return {
    id: `record-${index}`,
    title: index === 4 ? '目标相机' : `产品 ${index}`,
    salePrice: 1000 + index,
    costPrice: 500,
    purchaseShippingFee: 10,
    saleShippingFee: null,
    totalCost: 510,
    profit: 490 + index,
    roi: (490 + index) / 510,
    status: index === 4 ? '在售中' : '已售出',
    purchaseDate: '2026-01-01',
    soldDate: `2026-08-${String(index).padStart(2, '0')}`,
    holdingDays: index,
    note: null,
  };
}

describe('queryTransactions', () => {
  it('returns the page containing a focused transaction after reversed source ordering', () => {
    const records = Array.from({ length: 25 }, (_, index) => record(25 - index));
    const result = queryTransactions(records, {
      page: 1,
      pageSize: 20,
      sort: 'sourceOrder',
      order: 'desc',
      focusId: 'record-22',
    });

    expect(result.page).toBe(2);
    expect(result.items.some(({ id }) => id === 'record-22')).toBe(true);
    expect(records[0].id).toBe('record-25');
  });

  it('preserves or reverses the Feishu source order without mutating the input', () => {
    const records = [record(3), record(1), record(2)];

    const ascending = queryTransactions(records, {
      page: 1,
      pageSize: 20,
      sort: 'sourceOrder',
      order: 'asc',
    });
    const descending = queryTransactions(records, {
      page: 1,
      pageSize: 20,
      sort: 'sourceOrder',
      order: 'desc',
    });

    expect(ascending.items.map(({ id }) => id)).toEqual(['record-3', 'record-1', 'record-2']);
    expect(descending.items.map(({ id }) => id)).toEqual(['record-2', 'record-1', 'record-3']);
    expect(records.map(({ id }) => id)).toEqual(['record-3', 'record-1', 'record-2']);
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
    const result = queryTransactions(
      [record(3), { ...record(4), purchaseDate: '2026-08-04' }, record(5)],
      {
        page: 1,
        pageSize: 20,
        q: '相机',
        status: '在售中',
        from: '2026-08-04',
        to: '2026-08-04',
        sort: 'title',
        order: 'asc',
      },
    );

    expect(result.items.map(({ id }) => id)).toEqual(['record-4']);
    expect(result.total).toBe(1);
  });

  it('filters date ranges by purchaseDate instead of soldDate', () => {
    const result = queryTransactions(
      [
        { ...record(1), purchaseDate: '2026-01-01', soldDate: '2026-08-20' },
        { ...record(2), purchaseDate: '2026-08-10', soldDate: '2026-08-02' },
      ],
      {
        page: 1,
        pageSize: 20,
        from: '2026-08-05',
        to: '2026-08-31',
        sort: 'purchaseDate',
        order: 'asc',
      },
    );

    expect(result.items.map(({ id }) => id)).toEqual(['record-2']);
  });

  it('filters by soldDate when the sold date field is selected', () => {
    const result = queryTransactions(
      [
        { ...record(1), purchaseDate: '2026-08-10', soldDate: '2026-01-01' },
        { ...record(2), purchaseDate: '2026-01-10', soldDate: '2026-08-02' },
        { ...record(3), purchaseDate: '2026-08-03', soldDate: null },
      ],
      {
        page: 1,
        pageSize: 20,
        dateField: 'soldDate',
        from: '2026-08-01',
        to: '2026-08-31',
        sort: 'soldDate',
        order: 'asc',
      },
    );

    expect(result.items.map(({ id }) => id)).toEqual(['record-2']);
  });

  it('searches product names without matching notes', () => {
    const result = queryTransactions(
      [
        { ...record(1), title: '普通商品', note: '目标产品' },
        { ...record(2), title: '目标产品', note: '其他备注' },
      ],
      {
        page: 1,
        pageSize: 20,
        q: '目标产品',
        sort: 'title',
        order: 'asc',
      },
    );

    expect(result.items.map(({ id }) => id)).toEqual(['record-2']);
  });

  it('sorts transactions by purchaseDate descending placing null values at the end', () => {
    const records = [
      { ...record(1), purchaseDate: '2026-01-10' },
      { ...record(2), purchaseDate: null },
      { ...record(3), purchaseDate: '2026-08-12' },
    ];

    const result = queryTransactions(records, {
      page: 1,
      pageSize: 20,
      sort: 'purchaseDate',
      order: 'desc',
    });

    expect(result.items.map(({ id }) => id)).toEqual(['record-3', 'record-1', 'record-2']);
  });
});
