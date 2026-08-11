import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

afterEach(cleanup);

function Harness({ onConfirm = vi.fn() }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>打开删除</button>
      <ConfirmDialog
        open={open}
        title="删除交易？"
        description="删除后无法恢复"
        confirmLabel="删除"
        onCancel={() => setOpen(false)}
        onConfirm={onConfirm}
      />
    </>
  );
}

describe('ConfirmDialog', () => {
  it('focuses cancel, closes with Escape and restores trigger focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: '打开删除' });
    await user.click(trigger);
    expect(screen.getByRole('button', { name: '取消' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps Tab focus inside the two actions', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: '打开删除' }));
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: '删除' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: '取消' })).toHaveFocus();
  });

  it('confirms once and disables actions while pending', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <ConfirmDialog
        open
        title="删除交易？"
        description="删除后无法恢复"
        confirmLabel="删除"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    await user.click(screen.getByRole('button', { name: '删除' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    rerender(
      <ConfirmDialog
        open
        pending
        title="删除交易？"
        description="删除后无法恢复"
        confirmLabel="删除"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除中…' })).toBeDisabled();
  });

  it('does not submit twice when the confirm button is clicked rapidly', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(() => new Promise<void>(() => undefined));
    render(
      <ConfirmDialog
        open
        title="删除交易？"
        description="删除后无法恢复"
        confirmLabel="删除"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    await user.dblClick(screen.getByRole('button', { name: '删除' }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
