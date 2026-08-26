import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api/client';
import { LanguageProvider } from '../i18n';
import { BrowserPreferencesProvider } from '../preferences/BrowserPreferencesContext';
import LoginPage from './LoginPage';

function renderPage() {
  // jsdom 默认 en-US，固定为中文以便断言中文文案
  vi.stubGlobal('navigator', { languages: ['zh-CN', 'zh'] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BrowserPreferencesProvider>
        <LanguageProvider>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </LanguageProvider>
      </BrowserPreferencesProvider>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('announces the busy state while credentials are being verified', () => {
    vi.spyOn(apiClient, 'login').mockReturnValue(new Promise(() => undefined));
    renderPage();

    fireEvent.change(screen.getByLabelText('账号'), { target: { value: 'xinyu' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret' } });
    fireEvent.submit(screen.getByRole('button', { name: '登录' }).closest('form')!);

    expect(screen.getByRole('form', { name: '登录你的交易管理系统' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByRole('button', { name: '登录中…' })).toBeDisabled();
  });

  it('lets the user show and hide the password', () => {
    renderPage();

    const password = screen.getByLabelText('密码');
    expect(password).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: '显示密码' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: '隐藏密码' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '隐藏密码' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('shows a generic login error and the administrator contact', async () => {
    vi.spyOn(apiClient, 'login').mockRejectedValue(new Error('internal login detail'));
    renderPage();

    fireEvent.change(screen.getByLabelText('账号'), { target: { value: 'xinyu' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret' } });
    fireEvent.submit(screen.getByRole('button', { name: '登录' }).closest('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent('账号或密码错误');
    expect(screen.queryByText('internal login detail')).not.toBeInTheDocument();
  });

  it('switches language on the login page and persists it for the logged-in shell', () => {
    renderPage();

    expect(screen.getAllByRole('heading', { name: '登录你的交易管理系统' }).length).toBeGreaterThan(0);
    expect(screen.queryByText('Sign in to your trading console')).not.toBeInTheDocument();
    expect(screen.getByLabelText('账号')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    const languageSelect = screen.getByRole('combobox', { name: '界面语言' });
    expect(languageSelect).toHaveValue('zh');
    expect(screen.getByRole('option', { name: '🇨🇳 简体中文' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '🇺🇸 English' })).toBeInTheDocument();
    fireEvent.change(languageSelect, { target: { value: 'en' } });

    // 登录页立即切换为英文
    expect(
      screen.getAllByRole('heading', { name: 'Sign in to your trading management system' }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText('登录你的交易管理系统')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(languageSelect).toHaveValue('en');

    // 语言已持久化到 localStorage —— 登录成功后 AppShell 读同一数据源自动同步
    const stored = JSON.parse(localStorage.getItem('xinyu-admin.preferences') ?? '{}');
    expect(stored.language).toBe('en');
  });

  it('shares the theme toggle with the logged-in shell and defaults to light mode', () => {
    renderPage();

    const themeButton = screen.getByRole('button', { name: '切换到深色模式' });
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    fireEvent.click(themeButton);

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByRole('button', { name: '切换到浅色模式' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('xinyu-admin.preferences') ?? '{}').themeMode).toBe(
      'dark',
    );
  });
});
