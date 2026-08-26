import { createContext, useCallback, useContext, useMemo } from 'react';
import { useBrowserPreferences } from '../preferences/BrowserPreferencesContext';
import { interpolate, translations, type TranslationKey } from './translations';

interface LanguageContextValue {
  /** 当前语言（与 BrowserPreferences 单一数据源同步） */
  language: 'zh' | 'en';
  /** 切换语言，登录前后一致生效 */
  setLanguage: (language: 'zh' | 'en') => void;
  /** 取当前语言文案，支持 {placeholder} 插值 */
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { language, setLanguage } = useBrowserPreferences();

  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) =>
      interpolate(translations[language][key], values),
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used within LanguageProvider');
  return value;
}
