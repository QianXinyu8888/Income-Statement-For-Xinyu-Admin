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
  roi: 1082 / 4118,
  status: '已售出',
  purchaseDate: '2026-04-01',
  soldDate: '2026-08-10',
  holdingDays: 131,
  note: '顺丰到付',
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

  it('shows total cost and never renders an unsold record as a loss', () => {
    render(
      <TransactionList
        records={[
          {
            ...record,
            id: '2',
            status: '在售中',
            salePrice: null,
            totalCost: 105,
            profit: -105,
            roi: null,
            soldDate: null,
          },
        ]}
        selected={new Set()}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
        onSort={vi.fn()}
        sort="soldDate"
        order="desc"
      />,
    );
    expect(screen.getAllByRole('button', { name: /总成本/ }).length).toBeGreaterThan(0);
    expect(screen.queryByText('-¥105.00')).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('shows all desktop fields in the requested order', () => {
    const { container } = render(
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

    const headers = [...container.querySelectorAll('.desktop-list th:not(.check-cell)')]
      .map((cell) => cell.textContent?.trim())
      .filter(Boolean);
    expect(headers).toEqual([
      '商品名称',
      '交易状态',
      '购入日期',
      '售出日期',
      '持有天数',
      '购入成本',
      '运费',
      '总成本',
      '成交价',
      '利润',
      '备注',
    ]);
    expect(container.querySelector('.desktop-list .row-title')).toHaveTextContent(
      /^iPhone 15 Pro$/,
    );
  });

  it('shows all transaction fields directly in the mobile card', () => {
    const { container } = render(
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

    const mobile = container.querySelector('.mobile-list');
    expect(mobile).not.toBeNull();
    expect(mobile!).toHaveTextContent('iPhone 15 Pro');
    expect(mobile!).toHaveTextContent('交易状态');
    expect(mobile!).toHaveTextContent('购入日期2026-04-01');
    expect(mobile!).toHaveTextContent('售出日期2026-08-10');
    expect(mobile!).toHaveTextContent('持有天数131 天');
    expect(mobile!).toHaveTextContent('购入成本¥4,100.00');
    expect(mobile!).toHaveTextContent('运费¥18.00');
    expect(mobile!).toHaveTextContent('总成本¥4,118.00');
    expect(mobile!).toHaveTextContent('成交价¥5,200.00');
    expect(mobile!).toHaveTextContent('利润+¥1,082.00');
    expect(mobile!).toHaveTextContent('备注顺丰到付');
    expect(
      screen.getAllByRole('checkbox', { name: '选择 iPhone 15 Pro' })[1].closest('label'),
    ).toHaveClass('mobile-row__check');
  });

  it('marks the focused transaction in desktop and mobile views', () => {
    const { container } = render(
      <TransactionList
        records={[record, { ...record, id: '2', title: '另一件产品' }]}
        selected={new Set()}
        focusedId="1"
        onToggle={vi.fn()}
        onOpen={vi.fn()}
        onSort={vi.fn()}
        sort="soldDate"
        order="desc"
      />,
    );

    expect(container.querySelectorAll('[data-transaction-id="1"]')).toHaveLength(2);
    expect(
      container.querySelectorAll('[data-transaction-id="1"][data-focused="true"]'),
    ).toHaveLength(2);
    expect(
      container.querySelectorAll('[data-transaction-id="2"][data-focused="true"]'),
    ).toHaveLength(0);
  });
});
