export const PREFERENCES_STORAGE_KEY = 'xinyu-admin.preferences';

export const ALL_TRANSACTION_FIELDS = [
  'title',
  'status',
  'purchaseDate',
  'soldDate',
  'holdingDays',
  'costPrice',
  'purchaseShippingFee',
  'saleShippingFee',
  'totalCost',
  'salePrice',
  'profit',
  'note',
] as const;

export type TransactionFieldId = (typeof ALL_TRANSACTION_FIELDS)[number];
export type ThemeMode = 'system' | 'light' | 'dark';
export type Language = 'zh' | 'en';

export interface BrowserPreferencesV1 {
  version: 1;
  themeMode: ThemeMode;
  visibleTransactionFields: TransactionFieldId[];
  analysisMonth: string;
  language: Language;
}

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function localMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function isValidMonth(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12;
}

function defaults(now: Date): BrowserPreferencesV1 {
  return {
    version: 1,
    themeMode: 'light',
    visibleTransactionFields: [...ALL_TRANSACTION_FIELDS],
    analysisMonth: localMonth(now),
    language: detectBrowserLanguage(),
  };
}

/** 跟随浏览器语言：zh* → 中文，其余 → English */
export function detectBrowserLanguage(): Language {
  const languages = typeof navigator !== 'undefined' ? navigator.languages : [];
  return languages.some((code) => code.toLowerCase().startsWith('zh')) ? 'zh' : 'en';
}

export function readPreferences(
  storage: PreferenceStorage,
  now = new Date(),
): BrowserPreferencesV1 {
  const fallback = defaults(now);
  try {
    const raw = storage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) {
      const legacyTheme = storage.getItem('theme');
      return {
        ...fallback,
        themeMode: legacyTheme === 'dark' ? 'dark' : 'light',
      };
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.version !== 1) return fallback;
    const selected = new Set(
      Array.isArray(parsed.visibleTransactionFields) ? parsed.visibleTransactionFields : [],
    );
    selected.add('title');
    return {
      version: 1,
      themeMode:
        parsed.themeMode === 'light' || parsed.themeMode === 'dark' || parsed.themeMode === 'system'
          ? parsed.themeMode
          : fallback.themeMode,
      visibleTransactionFields: ALL_TRANSACTION_FIELDS.filter((field) => selected.has(field)),
      analysisMonth: isValidMonth(parsed.analysisMonth)
        ? parsed.analysisMonth
        : fallback.analysisMonth,
      language: parsed.language === 'en' ? 'en' : 'zh',
    };
  } catch {
    return fallback;
  }
}

export function writePreferences(
  storage: PreferenceStorage,
  preferences: BrowserPreferencesV1,
): boolean {
  try {
    storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
