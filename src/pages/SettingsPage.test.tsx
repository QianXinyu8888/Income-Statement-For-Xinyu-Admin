import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api/client';
import { BrowserPreferencesProvider } from '../preferences/BrowserPreferencesContext';
import SettingsPage from './SettingsPage';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BrowserPreferencesProvider>
        <SettingsPage />
      </BrowserPreferencesProvider>
    </QueryClientProvider>,
  );
}

describe('SettingsPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('presents account and service metadata as a named description list', async () => {
    vi.spyOn(apiClient, 'session').mockResolvedValue({
      user: { username: 'xinyu', role: '管理员' },
    });
    vi.spyOn(apiClient, 'health').mockResolvedValue({ connected: true, checkedAt: '2026-08-12' });
    renderPage();

    const metadata = await screen.findByRole('group', { name: '账号与服务状态' });
    expect(metadata.tagName).toBe('DL');
    expect(await screen.findByText('xinyu')).toBeInTheDocument();
    expect(await screen.findByText('正常')).toHaveClass('connected');
  });

  it('switches system → dark → light → system without a manual reduced-motion control', async () => {
    vi.spyOn(apiClient, 'session').mockResolvedValue({
      user: { username: 'xinyu', role: '管理员' },
    });
    vi.spyOn(apiClient, 'health').mockResolvedValue({ connected: true, checkedAt: '2026-08-13' });
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addEventListener,
        removeEventListener,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    const user = userEvent.setup();
    const rendered = renderPage();

    const theme = await screen.findByRole('radiogroup', { name: '主题模式' });
    expect(within(theme).getByRole('radio', { name: '跟随系统' })).toBeChecked();
    await user.click(within(theme).getByRole('radio', { name: '深色' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await user.click(within(theme).getByRole('radio', { name: '浅色' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    await user.click(within(theme).getByRole('radio', { name: '跟随系统' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.queryByRole('checkbox', { name: /缩减界面动画/ })).not.toBeInTheDocument();

    rendered.unmount();
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
