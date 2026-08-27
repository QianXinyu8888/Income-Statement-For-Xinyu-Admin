import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './api/client';
import App from './App';
import { LanguageProvider } from './i18n';
import { BrowserPreferencesProvider } from './preferences/BrowserPreferencesContext';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/');
});

describe('App routes', () => {
  it('renders the self-use workspace at /self-use', async () => {
    window.history.replaceState({}, '', '/self-use');
    vi.spyOn(apiClient, 'session').mockResolvedValue({ user: { username: 'xinyu', role: '用户' } });
    vi.spyOn(apiClient, 'transactions').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
      warnings: [],
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <BrowserPreferencesProvider>
          <LanguageProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </LanguageProvider>
        </BrowserPreferencesProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: '正在自用中的产品' })).toBeInTheDocument();
  });

  it('renders the listed workspace at /listed', async () => {
    window.history.replaceState({}, '', '/listed');
    vi.spyOn(apiClient, 'session').mockResolvedValue({ user: { username: 'xinyu', role: '用户' } });
    vi.spyOn(apiClient, 'transactions').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
      warnings: [],
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <BrowserPreferencesProvider>
          <LanguageProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </LanguageProvider>
        </BrowserPreferencesProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: '正在售卖的产品' })).toBeInTheDocument();
  });
});
