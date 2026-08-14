import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ALL_TRANSACTION_FIELDS,
  type TransactionFieldId,
} from '../../preferences/browser-preferences';
import { ColumnVisibilityPanel } from './ColumnVisibilityPanel';

function Harness({ onOutsideClick = () => undefined }: { onOutsideClick?: () => void }) {
  const [visible, setVisible] = useState<TransactionFieldId[]>([...ALL_TRANSACTION_FIELDS]);
  return (
    <>
      <ColumnVisibilityPanel
        visibleFields={visible}
        onFieldVisible={(field, nextVisible) =>
          setVisible((current) =>
            nextVisible
              ? ALL_TRANSACTION_FIELDS.filter((item) => current.includes(item) || item === field)
              : current.filter((item) => item !== field),
          )
        }
        onReset={() => setVisible([...ALL_TRANSACTION_FIELDS])}
      />
      <button type="button" onClick={onOutsideClick}>
        面板外按钮
      </button>
    </>
  );
}

describe('ColumnVisibilityPanel', () => {
  afterEach(cleanup);

  it('toggles optional fields, locks title, restores defaults and closes with Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: '选择显示字段' });

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: '显示字段' })).toHaveClass(
      'column-visibility__panel',
    );
    expect(
      screen.getByRole('checkbox', { name: '商品名称', description: '不可隐藏' }),
    ).toBeDisabled();
    expect(screen.getByText('不可隐藏')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: '交易状态' })).toHaveFocus();
    await user.click(screen.getByRole('checkbox', { name: '备注' }));
    expect(screen.getByRole('checkbox', { name: '备注' })).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: '恢复默认列' }));
    expect(screen.getByRole('checkbox', { name: '备注' })).toBeChecked();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('closes when clicking outside and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const onOutsideClick = vi.fn();
    render(<Harness onOutsideClick={onOutsideClick} />);
    const trigger = screen.getByRole('button', { name: '选择显示字段' });

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: '面板外按钮' }));

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    expect(onOutsideClick).toHaveBeenCalledOnce();
  });

  it('closes from the explicit close button and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: '选择显示字段' });

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: '关闭字段选择' }));

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });
});
