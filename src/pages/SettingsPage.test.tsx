import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api/client';
import SettingsPage from './SettingsPage';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SettingsPage />
    </QueryClientProvider>,
  );
}

describe('SettingsPage', () => {
  afterEach(() => vi.restoreAllMocks());

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
});
