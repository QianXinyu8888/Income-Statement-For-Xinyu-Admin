import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Transaction } from '../../domain/transaction';
import { SelfUseList } from './SelfUseList';

const record: Transaction = {
  id: 'headphones',
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
  note: null,
};

afterEach(cleanup);

function renderList(showListedAction = true) {
  const onMarkListed = vi.fn();
  const onSell = vi.fn();
  render(
    <SelfUseList
      records={[record]}
      listingId={null}
      onMarkListed={onMarkListed}
      onSell={onSell}
      onOpen={vi.fn()}
      showListedAction={showListedAction}
    />,
  );
  return { onMarkListed, onSell };
}

describe('SelfUseList actions', () => {
  it('keeps only product, cost, and actions in the active-products list', () => {
    const { container } = render(
      <SelfUseList
        records={[record]}
        listingId={null}
        onMarkListed={vi.fn()}
        onSell={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    expect([...container.querySelectorAll('.self-use-table th')].map((cell) => cell.textContent)).toEqual([
      '物品',
      '成本',
      '处理',
    ]);
    expect(container.querySelector('.self-use-mobile-card')).toHaveTextContent('成本¥920.00');
    expect(container.querySelector('.self-use-mobile-card')).not.toHaveTextContent('持有');
    expect(container.querySelector('.self-use-mobile-card')).not.toHaveTextContent('自用中');
  });

  it('uses macOS-style action buttons for a self-use record', async () => {
    const user = userEvent.setup();
    const { onMarkListed, onSell } = renderList();

    expect(screen.getAllByRole('button', { name: '标记 耳机 为在售中' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: '确认出售 耳机' })).toHaveLength(2);
    expect(screen.getAllByText('标记在售')).toHaveLength(2);
    expect(screen.getAllByText('确认售出')).toHaveLength(2);
    expect(screen.queryByText('售出…')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '标记 耳机 为在售中' })[0]);
    await user.click(screen.getAllByRole('button', { name: '确认出售 耳机' })[0]);

    expect(onMarkListed).toHaveBeenCalledWith(record);
    expect(onSell).toHaveBeenCalledWith(record);
  });

  it('shows only the sale action in the listed workspace', () => {
    renderList(false);

    expect(screen.queryByRole('button', { name: '标记 耳机 为在售中' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '确认出售 耳机' })).toHaveLength(2);
    expect(screen.getAllByText('确认售出')).toHaveLength(2);
  });
});
