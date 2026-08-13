import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ALL_TRANSACTION_FIELDS,
  type BrowserPreferencesV1,
  isValidMonth,
  readPreferences,
  type ThemeMode,
  type TransactionFieldId,
  writePreferences,
} from './browser-preferences';

interface BrowserPreferencesContextValue {
  preferences: BrowserPreferencesV1;
  effectiveTheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setTransactionFieldVisible: (field: TransactionFieldId, visible: boolean) => void;
  resetTransactionFields: () => void;
  setAnalysisMonth: (month: string) => void;
  setReduceMotion: (value: boolean) => void;
}

const BrowserPreferencesContext = createContext<BrowserPreferencesContextValue | null>(null);

const getStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => undefined };
  }
};

const getSystemTheme = (): 'light' | 'dark' =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export function BrowserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<BrowserPreferencesV1>(() =>
    readPreferences(getStorage()),
  );
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

  useEffect(() => {
    writePreferences(getStorage(), preferences);
  }, [preferences]);

  useEffect(() => {
    const effectiveTheme = preferences.themeMode === 'system' ? systemTheme : preferences.themeMode;
    document.documentElement.dataset.theme = effectiveTheme;
    document.documentElement.classList.toggle('reduce-motion', preferences.reduceMotion);
  }, [preferences.reduceMotion, preferences.themeMode, systemTheme]);

  useEffect(() => {
    if (preferences.themeMode !== 'system') return;

    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mediaQuery) return;
    const handleChange = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? 'dark' : 'light');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preferences.themeMode]);

  const effectiveTheme = preferences.themeMode === 'system' ? systemTheme : preferences.themeMode;

  const updatePreferences = useCallback((updater: (current: BrowserPreferencesV1) => BrowserPreferencesV1) => {
    setPreferences(updater);
  }, []);

  const value = useMemo<BrowserPreferencesContextValue>(
    () => ({
      preferences,
      effectiveTheme,
      setThemeMode: (themeMode) => updatePreferences((current) => ({ ...current, themeMode })),
      toggleTheme: () =>
        updatePreferences((current) => ({
          ...current,
          themeMode: effectiveTheme === 'dark' ? 'light' : 'dark',
        })),
      setTransactionFieldVisible: (field, visible) =>
        updatePreferences((current) => {
          if (field === 'title' && !visible) return current;
          const selected = new Set(current.visibleTransactionFields);
          if (visible) selected.add(field);
          else selected.delete(field);
          return {
            ...current,
            visibleTransactionFields: ALL_TRANSACTION_FIELDS.filter((item) => selected.has(item)),
          };
        }),
      resetTransactionFields: () =>
        updatePreferences((current) => ({
          ...current,
          visibleTransactionFields: [...ALL_TRANSACTION_FIELDS],
        })),
      setAnalysisMonth: (analysisMonth) => {
        if (isValidMonth(analysisMonth)) {
          updatePreferences((current) => ({ ...current, analysisMonth }));
        }
      },
      setReduceMotion: (reduceMotion) =>
        updatePreferences((current) => ({ ...current, reduceMotion })),
    }),
    [effectiveTheme, preferences, updatePreferences],
  );

  return <BrowserPreferencesContext.Provider value={value}>{children}</BrowserPreferencesContext.Provider>;
}

export function useBrowserPreferences(): BrowserPreferencesContextValue {
  const value = useContext(BrowserPreferencesContext);
  if (!value) throw new Error('useBrowserPreferences must be used within BrowserPreferencesProvider');
  return value;
}
