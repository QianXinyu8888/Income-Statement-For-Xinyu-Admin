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

function renderList(alternateStatus: '在售中' | '自用中' = '在售中') {
  const onChangeStatus = vi.fn();
  const onSell = vi.fn();
  render(
    <SelfUseList
      records={[record]}
      listingId={null}
      alternateStatus={alternateStatus}
      onChangeStatus={onChangeStatus}
      onSell={onSell}
      onOpen={vi.fn()}
    />,
  );
  return { onChangeStatus, onSell };
}

describe('SelfUseList actions', () => {
  it('keeps only product, cost, and actions in the active-products list', () => {
    const { container } = render(
      <SelfUseList
        records={[record]}
        listingId={null}
        alternateStatus="在售中"
        onChangeStatus={vi.fn()}
        onSell={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    expect([...container.querySelectorAll('.self-use-table th')].map((cell) => cell.textContent)).toEqual([
      '商品名称',
      '成本',
      '',
    ]);
    expect(container.querySelector('.self-use-mobile-card')).toHaveTextContent('成本¥920.00');
    expect(container.querySelector('.self-use-mobile-card')).not.toHaveTextContent('持有');
    expect(container.querySelector('.self-use-mobile-card')).not.toHaveTextContent('自用中');
  });

  it('shows direct listed and sale actions for self-use records', async () => {
    const user = userEvent.setup();
    const { onChangeStatus, onSell } = renderList();

    const listedButtons = screen.getAllByRole('button', { name: '设置 耳机 为在售中' });
    const saleButtons = screen.getAllByRole('button', { name: '设置 耳机 为已售出' });
    expect(screen.getAllByText('设为')).toHaveLength(2);

    await user.click(listedButtons[0]);
    await user.click(saleButtons[1]);

    expect(onChangeStatus).toHaveBeenCalledWith(record, '在售中');
    expect(onSell).toHaveBeenCalledWith(record);
  });

  it('shows the self-use action in the listed workspace', async () => {
    const user = userEvent.setup();
    const { onChangeStatus } = renderList('自用中');

    const selfUseButtons = screen.getAllByRole('button', { name: '设置 耳机 为自用中' });
    expect(screen.queryByRole('button', { name: '设置 耳机 为在售中' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '设置 耳机 为已售出' })).toHaveLength(2);

    await user.click(selfUseButtons[0]);

    expect(onChangeStatus).toHaveBeenCalledWith(record, '自用中');
  });
});
