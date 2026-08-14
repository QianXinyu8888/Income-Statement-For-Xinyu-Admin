import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrowserPreferencesProvider, useBrowserPreferences } from './BrowserPreferencesContext';
import { PREFERENCES_STORAGE_KEY } from './browser-preferences';

function Consumer() {
  const value = useBrowserPreferences();
  return (
    <>
      <output aria-label="mode">{value.preferences.themeMode}</output>
      <output aria-label="effective">{value.effectiveTheme}</output>
      <button onClick={value.toggleTheme}>快捷切换</button>
      <button onClick={() => value.setThemeMode('system')}>系统</button>
      <button onClick={() => value.setThemeMode('dark')}>深色</button>
    </>
  );
}

function installMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return matches;
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.delete(listener),
    dispatchEvent: () => true,
  }));
  return (next: boolean) => {
    matches = next;
    listeners.forEach((listener) => listener({ matches: next } as MediaQueryListEvent));
  };
}

describe('BrowserPreferencesProvider', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.unstubAllGlobals();
  });

  it('follows system changes only in system mode', async () => {
    const changeSystem = installMatchMedia(false);
    render(
      <BrowserPreferencesProvider>
        <Consumer />
      </BrowserPreferencesProvider>,
    );
    expect(screen.getByLabelText('effective')).toHaveTextContent('light');
    act(() => changeSystem(true));
    expect(screen.getByLabelText('effective')).toHaveTextContent('dark');
    await userEvent.click(screen.getByRole('button', { name: '深色' }));
    act(() => changeSystem(false));
    expect(screen.getByLabelText('effective')).toHaveTextContent('dark');
  });

  it('turns a quick toggle into the explicit opposite theme', async () => {
    installMatchMedia(true);
    render(
      <BrowserPreferencesProvider>
        <Consumer />
      </BrowserPreferencesProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: '快捷切换' }));
    expect(screen.getByLabelText('mode')).toHaveTextContent('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('ignores a stored manual reduced-motion value', () => {
    installMatchMedia(false);
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        themeMode: 'system',
        visibleTransactionFields: ['title'],
        analysisMonth: '2026-08',
        reduceMotion: true,
      }),
    );
    render(
      <BrowserPreferencesProvider>
        <Consumer />
      </BrowserPreferencesProvider>,
    );
    expect(document.documentElement).not.toHaveClass('reduce-motion');
  });
});
