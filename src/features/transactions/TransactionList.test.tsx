import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TransactionList } from './TransactionList';
import type { Transaction } from '../../domain/transaction';

const record: Transaction = {
  id: '1',
  title: 'iPhone 15 Pro',
  salePrice: 5200,
  costPrice: 4100,
  shippingFee: 18,
  totalCost: 4118,
  profit: 1082,
  profitRate: 1082 / 4100,
  roi: 1082 / 4118,
  status: '已售出',
  purchaseDate: '2026-04-01',
  soldDate: '2026-08-10',
  holdingDays: 131,
  sortOrder: 1,
  note: '',
};

describe('TransactionList', () => {
  it('shows essential mapped information in both responsive views', () => {
    render(
      <TransactionList
        records={[record]}
        selected={new Set()}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
        onSort={vi.fn()}
        sort="soldDate"
        order="desc"
      />,
    );
    expect(screen.getAllByText('iPhone 15 Pro').length).toBeGreaterThan(0);
    expect(screen.getAllByText('已售出').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+¥1,082.00').length).toBeGreaterThan(0);
    expect(screen.getByRole('table', { name: '交易明细' })).toBeInTheDocument();
  });
});
