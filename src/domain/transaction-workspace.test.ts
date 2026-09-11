import { describe, expect, it } from 'vitest';
import type { Transaction } from './transaction';
import { buildTransactionWorkspace } from './transaction-workspace';

const septemberSale: Transaction = {
  id: 'sale-1',
  title: '九月售出商品',
  salePrice: 1200,
  costPrice: 500,
  purchaseShippingFee: 10,
  saleShippingFee: null,
  totalCost: 510,
  profit: 690,
  roi: 690 / 510,
  status: '已售出',
  purchaseDate: '2026-08-30',
  soldDate: '2026-09-02',
  holdingDays: 3,
  note: null,
};

const augustSale: Transaction = { ...septemberSale, id: 'sale-2', soldDate: '2026-08-31' };

describe('buildTransactionWorkspace', () => {
  it('uses one mapped record collection for the requested list, summary, and warnings', () => {
    const workspace = buildTransactionWorkspace(
      [septemberSale, augustSale],
      ['bad-record: 未识别字段'],
      {
        page: 1,
        pageSize: 20,
        sort: 'purchaseDate',
        order: 'desc',
      },
      { from: '2026-09-01', to: '2026-09-30' },
    );

    expect(workspace.transactions).toMatchObject({
      items: [septemberSale, augustSale],
      total: 2,
      page: 1,
      pageSize: 20,
    });
    expect(workspace.summary).toMatchObject({
      revenue: 1200,
      totalCost: 510,
      profit: 690,
      count: 1,
    });
    expect(workspace.warnings).toEqual(['bad-record: 未识别字段']);
  });
});
