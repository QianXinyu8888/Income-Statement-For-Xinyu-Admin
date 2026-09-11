import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api/client';
import { LanguageProvider } from '../i18n';
import { BrowserPreferencesProvider } from '../preferences/BrowserPreferencesContext';
import { PREFERENCES_STORAGE_KEY } from '../preferences/browser-preferences';
import { formatVersionUpdatedAt, VERSION_UPDATED_AT } from '../version';
import SettingsPage from './SettingsPage';

function renderPage(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  // jsdom 默认 en-US，固定为中文以便断言中文文案
  vi.stubGlobal('navigator', { languages: ['zh-CN', 'zh'] });
  return render(
    <QueryClientProvider client={client}>
      <BrowserPreferencesProvider>
        <LanguageProvider>
          <SettingsPage />
        </LanguageProvider>
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
    expect(within(metadata).getByText('数据库连接状态')).toBeInTheDocument();
    expect(await screen.findByText('xinyu')).toBeInTheDocument();
    expect(await screen.findByText('正常')).toHaveClass('connected');
    expect(within(metadata).getByText(formatVersionUpdatedAt(VERSION_UPDATED_AT))).toBeInTheDocument();
    expect(within(metadata).queryByText('2.0.0')).not.toBeInTheDocument();
  });

  it('refreshes a fresh cached session when the settings page mounts', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    client.setQueryData(['session'], { user: { username: 'xinyu', role: '用户' } });
    const session = vi.spyOn(apiClient, 'session').mockResolvedValue({
      user: { username: 'xinyu', role: '管理员' },
    });
    vi.spyOn(apiClient, 'health').mockResolvedValue({ connected: true, checkedAt: '2026-08-13' });

    renderPage(client);

    expect(await screen.findByText('管理员')).toBeInTheDocument();
    expect(session).toHaveBeenCalledOnce();
  });

  it('shows the shared loading gif while account permissions synchronize', () => {
    vi.spyOn(apiClient, 'session').mockReturnValue(new Promise(() => {}));
    vi.spyOn(apiClient, 'health').mockResolvedValue({ connected: true, checkedAt: '2026-08-13' });

    renderPage();

    expect(screen.getByRole('presentation')).toHaveAttribute('src', '/loading.gif');
    expect(screen.queryByText('同步中')).not.toBeInTheDocument();
  });

  it('does not present a cached role as current when synchronization fails', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    client.setQueryData(['session'], { user: { username: 'xinyu', role: '旧角色' } });
    vi.spyOn(apiClient, 'session').mockRejectedValue(new Error('飞书服务暂时不可用'));
    vi.spyOn(apiClient, 'health').mockResolvedValue({ connected: false, checkedAt: '2026-08-13' });

    renderPage(client);

    expect(await screen.findByText('同步失败')).toBeInTheDocument();
    expect(screen.queryByText('旧角色')).not.toBeInTheDocument();
  });

  it('does not render the removed security notice', async () => {
    vi.spyOn(apiClient, 'session').mockResolvedValue({
      user: { username: 'xinyu', role: '管理员' },
    });
    vi.spyOn(apiClient, 'health').mockResolvedValue({ connected: true, checkedAt: '2026-08-13' });

    renderPage();

    expect(await screen.findByText('管理员')).toBeInTheDocument();
    expect(screen.queryByText('安全提示')).not.toBeInTheDocument();
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
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        themeMode: 'system',
        visibleTransactionFields: ['title'],
        analysisMonth: '2026-08',
        language: 'zh',
      }),
    );
    const rendered = renderPage();

    expect(await screen.findByRole('group', { name: '界面偏好' })).toBeInTheDocument();
    const theme = await screen.findByRole('radiogroup', { name: '主题模式' });
    expect(
      within(theme)
        .getAllByRole('radio')
        .map((radio) => radio.closest('label')?.textContent?.trim()),
    ).toEqual(['浅色', '深色', '跟随系统']);
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

  it('switches language and persists the choice', async () => {
    vi.spyOn(apiClient, 'session').mockResolvedValue({
      user: { username: 'xinyu', role: '管理员' },
    });
    vi.spyOn(apiClient, 'health').mockResolvedValue({ connected: true, checkedAt: '2026-08-13' });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('heading', { name: '设置' })).toBeInTheDocument();
    const language = await screen.findByRole('radiogroup', { name: '语言' });
    await user.click(within(language).getByRole('radio', { name: 'English' }));

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Account & service status' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('xinyu-admin.preferences') ?? '{}').language).toBe('en');

    const languageAfter = await screen.findByRole('radiogroup', { name: 'Language' });
    await user.click(within(languageAfter).getByRole('radio', { name: '简体中文' }));
    expect(await screen.findByRole('heading', { name: '设置' })).toBeInTheDocument();
  });
});
