import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Pagination } from './Pagination';

describe('Pagination Component', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders summary, nav buttons and native select trigger', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageSize={20} total={150} onPageChange={onPageChange} />);

    expect(screen.getByText(/150/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '选择跳转页码' })).toHaveValue('1');
    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '下一页' })).not.toBeDisabled();
  });

  it('triggers page change directly on native select change', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageSize={20} total={100} onPageChange={onPageChange} />);

    const select = screen.getByRole('combobox', { name: '选择跳转页码' });
    fireEvent.change(select, { target: { value: '4' } });

    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('supports prev and next page navigation', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} pageSize={20} total={100} onPageChange={onPageChange} />);

    const prevBtn = screen.getByRole('button', { name: '上一页' });
    const nextBtn = screen.getByRole('button', { name: '下一页' });

    fireEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
