import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Transaction } from '../../domain/transaction';
import { TransactionDrawer } from './TransactionDrawer';

afterEach(cleanup);

const record: Transaction = {
  id: 'rec-1',
  title: '测试商品',
  status: '已售出',
  salePrice: 200,
  costPrice: 100,
  shippingFee: 20,
  totalCost: null,
  profit: 40,
  roi: 0.4,
  purchaseDate: '2026-08-01',
  soldDate: '2026-08-02',
  holdingDays: 1,
  sortOrder: null,
  note: null,
};

describe('TransactionDrawer', () => {
  it('shows only Feishu formula values for an existing record', () => {
    render(
      <TransactionDrawer record={record} open saving={false} onClose={vi.fn()} onSave={vi.fn()} />,
    );

    expect(screen.getByText('利润（飞书） ¥40.00')).toBeInTheDocument();
    expect(screen.getByText('总成本（飞书）').parentElement).toHaveTextContent('—');
    expect(screen.queryByText('¥120.00')).not.toBeInTheDocument();
  });
});
