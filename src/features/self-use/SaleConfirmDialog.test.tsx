import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Transaction } from '../../domain/transaction';
import { getUsageDayNumber } from '../../domain/self-use';
import { SaleConfirmDialog } from './SaleConfirmDialog';

afterEach(cleanup);

const record: Transaction = {
  id: 'headphones',
  title: 'AirPods Pro',
  salePrice: null,
  costPrice: 1200,
  purchaseShippingFee: 0,
  saleShippingFee: null,
  totalCost: 1299,
  profit: null,
  roi: null,
  status: '自用中',
  purchaseDate: '2026-04-23',
  soldDate: null,
  holdingDays: 126,
  note: null,
};

describe('SaleConfirmDialog', () => {
  it('allows blank sale details and shows the confirmed copy and profit preview', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <SaleConfirmDialog
        record={record}
        open
        saving={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.getByText(`今天是你自用AirPods Pro的第 ${getUsageDayNumber(record.purchaseDate)} 天`),
    ).toBeInTheDocument();
    expect(screen.getByText('利润').parentElement).toHaveTextContent('—');
    expect(screen.getByRole('textbox', { name: '备注' })).not.toHaveAttribute('placeholder');

    await user.click(screen.getByRole('button', { name: '确认售出' }));
    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith({
        salePrice: null,
        soldDate: null,
        note: '',
      }),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.type(screen.getByRole('spinbutton', { name: '售价' }), '1450');
    expect(screen.getByText('利润').parentElement).toHaveTextContent('+¥151.00');
    await user.click(screen.getByRole('button', { name: '确认售出' }));

    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith({
        salePrice: 1450,
        soldDate: null,
        note: '',
      }),
    );
  });

  it('rejects a negative non-empty sale price', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <SaleConfirmDialog
        record={record}
        open
        saving={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByRole('spinbutton', { name: '售价' }), '-1');
    await user.click(screen.getByRole('button', { name: '确认售出' }));

    expect(screen.getByRole('alert')).toHaveTextContent('请输入有效售价');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps its values and shows a save error when confirmation rejects', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue(new Error('网络异常'));
    render(
      <SaleConfirmDialog
        record={record}
        open
        saving={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByRole('spinbutton', { name: '售价' }), '1450');
    await user.type(screen.getByRole('textbox', { name: '备注' }), '面交');
    await user.click(screen.getByRole('button', { name: '确认售出' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('网络异常');
    expect(screen.getByRole('spinbutton', { name: '售价' })).toHaveValue(1450);
    expect(screen.getByRole('textbox', { name: '备注' })).toHaveValue('面交');
  });
});
