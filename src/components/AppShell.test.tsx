import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';

afterEach(cleanup);

function renderShell(onTheme = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/transactions']}>
        <Routes>
          <Route
            element={
              <AppShell
                user={{ username: 'xinyu', role: '用户' }}
                theme="light"
                onTheme={onTheme}
              />
            }
          >
            <Route path="/transactions" element={<div>交易内容</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { onTheme };
}

describe('AppShell', () => {
  it('keeps four destinations in both desktop and mobile navigation', () => {
    renderShell();
    expect(screen.getAllByRole('link', { name: '交易' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: '概览' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: '分析' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: '设置' })).toHaveLength(2);
  });

  it('places the desktop theme action in the top utility bar', async () => {
    const { onTheme } = renderShell();
    const topbar = screen.getByRole('banner');
    await userEvent.click(within(topbar).getByRole('button', { name: '切换到深色模式' }));
    expect(onTheme).toHaveBeenCalledOnce();
  });
});
