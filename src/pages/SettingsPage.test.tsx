import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api/client';
import SettingsPage from './SettingsPage';

function renderPage(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return render(
    <QueryClientProvider client={client}>
      <SettingsPage />
    </QueryClientProvider>,
  );
}

describe('SettingsPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
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
});
