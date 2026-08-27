import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { apiClient } from '../api/client';
import { LanguageProvider } from '../i18n';
import { BrowserPreferencesProvider } from '../preferences/BrowserPreferencesContext';

afterEach(cleanup);

function renderShell(onTheme = vi.fn()) {
  vi.stubGlobal('navigator', { languages: ['zh-CN', 'zh'] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <BrowserPreferencesProvider>
        <LanguageProvider>
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
        </LanguageProvider>
      </BrowserPreferencesProvider>
    </QueryClientProvider>,
  );
  return { onTheme };
}

describe('AppShell', () => {
  it('replaces the mobile bottom navigation with a closed sidebar by default', () => {
    renderShell();

    expect(screen.queryByRole('navigation', { name: '移动端主导航' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '主导航' })).not.toBeInTheDocument();
  });

  it('opens the mobile sidebar with every desktop workspace and logout action', async () => {
    renderShell();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '打开导航菜单' }));

    const menu = screen.getByRole('dialog', { name: '主导航' });
    expect(within(menu).getAllByRole('link').map((link) => link.textContent)).toEqual([
      '交易',
      '在售中',
      '自用中',
      '概览',
      '分析',
      '设置',
    ]);
    expect(within(menu).getByRole('button', { name: '退出登录' })).toBeInTheDocument();
  });

  it('closes the mobile sidebar after navigation', async () => {
    renderShell();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '打开导航菜单' }));
    await user.click(within(screen.getByRole('dialog', { name: '主导航' })).getByRole('link', { name: '概览' }));

    expect(screen.queryByRole('dialog', { name: '主导航' })).not.toBeInTheDocument();
  });

  it('places the desktop theme action in the top utility bar', async () => {
    const { onTheme } = renderShell();
    const topbar = document.querySelector<HTMLElement>('.topbar')!;
    await userEvent.click(within(topbar).getByRole('button', { name: '切换到深色模式' }));
    expect(onTheme).toHaveBeenCalledOnce();
  });

  it('switches language from the topbar language menu', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.stubGlobal('navigator', { languages: ['zh-CN', 'zh'] });
    render(
      <QueryClientProvider client={client}>
        <BrowserPreferencesProvider>
          <LanguageProvider>
            <MemoryRouter initialEntries={['/transactions']}>
              <Routes>
                <Route
                  element={
                    <AppShell
                      user={{ username: 'xinyu', role: '用户' }}
                      theme="light"
                      onTheme={vi.fn()}
                    />
                  }
                >
                  <Route path="/transactions" element={<div>交易内容</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          </LanguageProvider>
        </BrowserPreferencesProvider>
      </QueryClientProvider>,
    );
    const topbar = document.querySelector<HTMLElement>('.topbar')!;
    await userEvent.click(within(topbar).getByRole('button', { name: '界面语言' }));
    const menu = screen.getByRole('menu', { name: '界面语言' });
    expect(within(menu).getByRole('menuitem', { name: 'English' })).toBeInTheDocument();
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'English' }));
    expect(within(topbar).getByRole('button', { name: 'Language' })).toBeInTheDocument();
    // 切回中文，避免影响后续测试（localStorage 持久化）
    await userEvent.click(within(topbar).getByRole('button', { name: 'Language' }));
    await userEvent.click(
      within(screen.getByRole('menu', { name: 'Language' })).getByRole('menuitem', {
        name: '简体中文',
      }),
    );
  });

  it('opens the account menu from the topbar avatar and signs out', async () => {
    const logoutSpy = vi.spyOn(apiClient, 'logout').mockResolvedValue({ success: true });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.stubGlobal('navigator', { languages: ['zh-CN', 'zh'] });
    render(
      <QueryClientProvider client={client}>
        <BrowserPreferencesProvider>
          <LanguageProvider>
            <MemoryRouter initialEntries={['/transactions']}>
              <Routes>
                <Route
                  element={
                    <AppShell
                      user={{ username: 'xinyu', role: '用户' }}
                      theme="light"
                      onTheme={vi.fn()}
                    />
                  }
                >
                  <Route path="/transactions" element={<div>交易内容</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          </LanguageProvider>
        </BrowserPreferencesProvider>
      </QueryClientProvider>,
    );
    const topbar = document.querySelector<HTMLElement>('.topbar')!;
    await userEvent.click(within(topbar).getByRole('button', { name: '当前账号 xinyu' }));
    const menu = screen.getByRole('menu', { name: '账号菜单' });
    const logoutItem = within(menu).getByRole('menuitem', { name: '退出登录' });
    await userEvent.click(logoutItem);
    expect(logoutSpy).toHaveBeenCalledOnce();
  });
});
