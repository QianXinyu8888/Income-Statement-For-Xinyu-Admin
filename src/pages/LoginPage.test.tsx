import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api/client';
import LoginPage from './LoginPage';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('announces the busy state while credentials are being verified', () => {
    vi.spyOn(apiClient, 'login').mockReturnValue(new Promise(() => undefined));
    renderPage();

    fireEvent.change(screen.getByLabelText('账号'), { target: { value: 'xinyu' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret' } });
    fireEvent.submit(screen.getByRole('button', { name: '登录' }).closest('form')!);

    expect(screen.getByRole('form', { name: '登录闲鱼损益' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByRole('button', { name: '正在登录…' })).toBeDisabled();
  });
});
