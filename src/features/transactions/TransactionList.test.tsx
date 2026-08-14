import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TransactionList } from './TransactionList';
import type { Transaction } from '../../domain/transaction';
import { ALL_TRANSACTION_FIELDS } from '../../preferences/browser-preferences';

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
  afterEach(cleanup);

  it('shows essential mapped information in both responsive views', () => {
    render(
      <TransactionList
        records={[record]}
        selected={new Set()}
        visibleFields={[...ALL_TRANSACTION_FIELDS]}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
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
        visibleFields={[...ALL_TRANSACTION_FIELDS]}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('columnheader', { name: '总成本' }).length).toBeGreaterThan(0);
    expect(screen.queryByText('-¥105.00')).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('shows all desktop fields in the requested order', () => {
    const { container } = render(
      <TransactionList
        records={[record]}
        selected={new Set()}
        visibleFields={[...ALL_TRANSACTION_FIELDS]}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
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
        visibleFields={[...ALL_TRANSACTION_FIELDS]}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
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
        visibleFields={[...ALL_TRANSACTION_FIELDS]}
        focusedId="1"
        onToggle={vi.fn()}
        onOpen={vi.fn()}
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

  it('opens each editable desktop field with its matching focus target', () => {
    const onOpen = vi.fn();
    const { container } = render(
      <TransactionList
        records={[record]}
        selected={new Set()}
        visibleFields={[...ALL_TRANSACTION_FIELDS]}
        onToggle={vi.fn()}
        onOpen={onOpen}
      />,
    );

    const editableFields = [
      'title',
      'status',
      'purchaseDate',
      'soldDate',
      'costPrice',
      'shippingFee',
      'salePrice',
      'note',
    ];
    const buttons = container.querySelectorAll<HTMLButtonElement>(
      '.desktop-list [data-edit-field]',
    );
    expect([...buttons].map((button) => button.dataset.editField)).toEqual(editableFields);

    buttons.forEach((button, index) => {
      fireEvent.click(button);
      expect(onOpen).toHaveBeenNthCalledWith(index + 1, record, editableFields[index]);
    });
  });

  it('keeps calculated desktop fields read-only', () => {
    const { container } = render(
      <TransactionList
        records={[record]}
        selected={new Set()}
        visibleFields={[...ALL_TRANSACTION_FIELDS]}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    const row = container.querySelector('.desktop-list tbody tr');
    expect(row).toHaveTextContent('131 天');
    expect(row).toHaveTextContent('¥4,118.00');
    expect(row).toHaveTextContent('+¥1,082.00');
    expect(row?.querySelector('[data-edit-field="holdingDays"]')).toBeNull();
    expect(row?.querySelector('[data-edit-field="totalCost"]')).toBeNull();
    expect(row?.querySelector('[data-edit-field="profit"]')).toBeNull();
  });

  it('provides the same editable field targets in the mobile card', () => {
    const onOpen = vi.fn();
    const { container } = render(
      <TransactionList
        records={[record]}
        selected={new Set()}
        visibleFields={[...ALL_TRANSACTION_FIELDS]}
        onToggle={vi.fn()}
        onOpen={onOpen}
      />,
    );

    const editableFields = [
      'title',
      'status',
      'purchaseDate',
      'soldDate',
      'costPrice',
      'shippingFee',
      'salePrice',
      'note',
    ];
    const buttons = container.querySelectorAll<HTMLButtonElement>('.mobile-list [data-edit-field]');
    expect([...buttons].map((button) => button.dataset.editField)).toEqual(editableFields);

    buttons.forEach((button, index) => {
      fireEvent.click(button);
      expect(onOpen).toHaveBeenNthCalledWith(index + 1, record, editableFields[index]);
    });
  });

  it('uses the same visibility preferences in desktop and mobile layouts', () => {
    const { container } = render(
      <TransactionList
        records={[record]}
        selected={new Set()}
        visibleFields={['title', 'profit']}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByRole('columnheader', { name: '商品名称' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '利润' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '备注' })).not.toBeInTheDocument();
    expect(container.querySelector('.mobile-list')).toHaveTextContent('利润+¥1,082.00');
    expect(container.querySelector('.mobile-list')).not.toHaveTextContent('备注顺丰到付');
  });

  it('always shows the title even when the caller omits it', () => {
    const { container } = render(
      <TransactionList
        records={[record]}
        selected={new Set()}
        visibleFields={[]}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByRole('columnheader', { name: '商品名称' })).toBeInTheDocument();
    expect(container.querySelector('.mobile-list')).toHaveTextContent('iPhone 15 Pro');
    expect(container.querySelector('.mobile-row')).toHaveClass('mobile-row--compact');
    expect(container.querySelector('.mobile-row__details')).not.toBeInTheDocument();
  });

  it('lets a single mobile detail span the full row', () => {
    const { container } = render(
      <TransactionList
        records={[record]}
        selected={new Set()}
        visibleFields={['title', 'profit']}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    const details = container.querySelectorAll('.mobile-row__details > div');
    expect(details).toHaveLength(1);
    expect(details[0]).toHaveClass('mobile-row__detail', 'mobile-row__detail--wide');
  });

  it('lets only the last detail span the full row when the visible count is odd', () => {
    const { container } = render(
      <TransactionList
        records={[record]}
        selected={new Set()}
        visibleFields={['title', 'purchaseDate', 'soldDate', 'profit']}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    const details = container.querySelectorAll('.mobile-row__details > div');
    expect(details).toHaveLength(3);
    expect(details[0]).toHaveClass('mobile-row__detail');
    expect(details[0]).not.toHaveClass('mobile-row__detail--wide');
    expect(details[1]).not.toHaveClass('mobile-row__detail--wide');
    expect(details[2]).toHaveClass('mobile-row__detail', 'mobile-row__detail--wide');
  });

  it('keeps a final note in the second column when the detail count is even', () => {
    const { container } = render(
      <TransactionList
        records={[record]}
        selected={new Set()}
        visibleFields={['title', 'profit', 'note']}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    const details = container.querySelectorAll('.mobile-row__details > div');
    expect(details).toHaveLength(2);
    expect(details[1]).toHaveClass('mobile-row__detail', 'mobile-row__note');
    expect(details[1]).not.toHaveClass('mobile-row__detail--wide');
  });
});
