import { useState } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Transaction } from '../../domain/transaction';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { TransactionDrawer } from './TransactionDrawer';

afterEach(cleanup);

const record: Transaction = {
  id: 'rec-1',
  title: '测试商品',
  status: '已售出',
  salePrice: 200,
  costPrice: 100,
  purchaseShippingFee: 20,
  saleShippingFee: 5,
  totalCost: null,
  profit: 40,
  roi: 0.4,
  purchaseDate: '2026-08-01',
  soldDate: '2026-08-02',
  holdingDays: 1,
  note: null,
};

function DrawerHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>打开新增交易</button>
      <TransactionDrawer
        record={null}
        open={open}
        saving={false}
        onClose={() => setOpen(false)}
        onSave={vi.fn()}
      />
    </>
  );
}

function NestedDialogHarness() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(true);
  return (
    <>
      <TransactionDrawer
        record={record}
        open={drawerOpen}
        saving={false}
        onClose={() => setDrawerOpen(false)}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="删除这条交易？"
        description="删除后无法恢复"
        confirmLabel="删除"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={vi.fn()}
      />
    </>
  );
}

describe('TransactionDrawer', () => {
  it('mounts the fixed overlay at the document root', () => {
    render(
      <div style={{ transform: 'translateY(0)' }}>
        <TransactionDrawer record={null} open saving={false} onClose={vi.fn()} onSave={vi.fn()} />
      </div>,
    );

    expect(screen.getByRole('dialog').closest('.drawer-layer')?.parentElement).toBe(document.body);
  });

  it('shows only Feishu formula values for an existing record', () => {
    render(
      <TransactionDrawer record={record} open saving={false} onClose={vi.fn()} onSave={vi.fn()} />,
    );

    expect(screen.getByText('利润（飞书） ¥40.00')).toBeInTheDocument();
    expect(screen.getByText('总成本（飞书）').parentElement).toHaveTextContent('—');
    expect(screen.queryByText('¥120.00')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('排序')).not.toBeInTheDocument();
  });

  it('uses 待收货 and only purchase fields for a new transaction', () => {
    render(<TransactionDrawer record={null} open saving={false} onClose={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByText('待收货')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: '状态' })).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: '购入成本' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: '购入运费' })).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: '售价' })).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: '售出运费' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '售出日期' })).not.toBeInTheDocument();
  });

  it('traps focus, locks scrolling, and restores the trigger after Escape', async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    const trigger = screen.getByRole('button', { name: '打开新增交易' });
    await user.click(trigger);

    expect(screen.getByRole('textbox', { name: '商品名称' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    const close = screen.getByRole('button', { name: /^关闭$/ });
    close.focus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: '保存' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('defers Escape and Tab handling to a nested confirmation dialog', async () => {
    const user = userEvent.setup();
    render(<NestedDialogHarness />);
    const confirmation = screen.getByRole('alertdialog');

    expect(within(confirmation).getByRole('button', { name: '取消' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(within(confirmation).getByRole('button', { name: '删除' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('focuses the requested editable field', async () => {
    render(
      <TransactionDrawer
        record={record}
        open
        saving={false}
        initialFocus="status"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(await screen.findByRole('combobox', { name: '状态' })).toHaveFocus();
  });

  it('places the text cursor at the end of the requested field', async () => {
    render(
      <TransactionDrawer
        record={{ ...record, note: '已有备注' }}
        open
        saving={false}
        initialFocus="note"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    const note = await screen.findByRole('textbox', { name: '备注' });
    expect(note).toHaveFocus();
    expect(note).toHaveProperty('selectionStart', 4);
    expect(note).toHaveProperty('selectionEnd', 4);
  });
});
