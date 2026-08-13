export const PREFERENCES_STORAGE_KEY = 'xinyu-admin.preferences';

export const ALL_TRANSACTION_FIELDS = [
  'title',
  'status',
  'purchaseDate',
  'soldDate',
  'holdingDays',
  'costPrice',
  'shippingFee',
  'totalCost',
  'salePrice',
  'profit',
  'note',
] as const;

export type TransactionFieldId = (typeof ALL_TRANSACTION_FIELDS)[number];
export type ThemeMode = 'system' | 'light' | 'dark';

export interface BrowserPreferencesV1 {
  version: 1;
  themeMode: ThemeMode;
  visibleTransactionFields: TransactionFieldId[];
  analysisMonth: string;
  reduceMotion: boolean;
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
    themeMode: 'system',
    visibleTransactionFields: [...ALL_TRANSACTION_FIELDS],
    analysisMonth: localMonth(now),
    reduceMotion: false,
  };
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
      const legacyMotion = storage.getItem('reduce-motion');
      return {
        ...fallback,
        themeMode: legacyTheme === 'light' || legacyTheme === 'dark' ? legacyTheme : 'system',
        reduceMotion: legacyMotion === 'true',
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
      reduceMotion:
        typeof parsed.reduceMotion === 'boolean' ? parsed.reduceMotion : fallback.reduceMotion,
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
