import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalysisMonthControl } from './AnalysisMonthControl';

describe('AnalysisMonthControl', () => {
  afterEach(cleanup);

  it('opens the month dialog, navigates years and selects a month', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AnalysisMonthControl
        value="2026-08"
        currentMonth="2026-08"
        onChange={onChange}
        onReset={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', {
      name: '选择分析月份，当前为 2026 年 8 月',
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: '选择分析月份' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: '上一年' }));
    expect(screen.getByText('2025 年')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '选择 2025 年 2 月' }));

    expect(onChange).toHaveBeenCalledWith('2025-02');
    expect(screen.queryByRole('dialog', { name: '选择分析月份' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps reset available and restores focus after reset or escape', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(
      <AnalysisMonthControl
        value="2026-08"
        currentMonth="2026-08"
        onChange={vi.fn()}
        onReset={onReset}
      />,
    );

    const trigger = screen.getByRole('button', { name: /选择分析月份/ });
    await user.click(trigger);
    const reset = screen.getByRole('button', { name: '回到本月' });
    expect(reset).toBeEnabled();
    await user.click(reset);

    expect(onReset).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: '选择分析月份' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: '选择分析月份' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes when clicking outside the control', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <AnalysisMonthControl
          value="2026-08"
          currentMonth="2026-08"
          onChange={vi.fn()}
          onReset={vi.fn()}
        />
        <button type="button">页面其他操作</button>
      </div>,
    );

    const trigger = screen.getByRole('button', { name: /选择分析月份/ });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: '页面其他操作' }));

    expect(screen.queryByRole('dialog', { name: '选择分析月份' })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
