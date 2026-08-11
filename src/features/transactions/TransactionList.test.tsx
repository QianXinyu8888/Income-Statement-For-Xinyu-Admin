import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TransactionList } from './TransactionList';
import type { Transaction } from '../../domain/transaction';

const record: Transaction = {
  id: '1',
  title: 'iPhone 15 Pro',
  category: '手机',
  salePrice: 5200,
  costPrice: 4100,
  shippingFee: 18,
  profit: 1082,
  profitRate: 1082 / 4100,
  status: '已售出',
  transactionDate: '2026-08-10',
  note: '',
};

describe('TransactionList', () => {
  it('shows the same essential information in the responsive list', () => {
    render(
      <TransactionList
        records={[record]}
        selected={new Set()}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
        onSort={vi.fn()}
        sort="transactionDate"
        order="desc"
      />,
    );
    expect(screen.getAllByText('iPhone 15 Pro').length).toBeGreaterThan(0);
    expect(screen.getAllByText('已售出').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+¥1,082.00').length).toBeGreaterThan(0);
    expect(screen.getByRole('table', { name: '交易明细' })).toBeInTheDocument();
  });
});
