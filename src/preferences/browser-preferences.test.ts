import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ALL_TRANSACTION_FIELDS,
  PREFERENCES_STORAGE_KEY,
  readPreferences,
  writePreferences,
} from './browser-preferences';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const august = new Date(2026, 7, 13, 12);

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubNavigatorLanguages(languages: string[]) {
  vi.stubGlobal('navigator', { languages });
}

describe('browser preferences storage', () => {
  it('defaults a new browser to light theme, all fields, this month and browser language', () => {
    stubNavigatorLanguages(['en-US', 'en']);
    const storage = new MemoryStorage();
    expect(readPreferences(storage, august)).toEqual({
      version: 1,
      themeMode: 'light',
      visibleTransactionFields: ALL_TRANSACTION_FIELDS,
      analysisMonth: '2026-08',
      language: 'en',
    });
  });

  it('defaults language to zh when browser is Chinese', () => {
    stubNavigatorLanguages(['zh-CN', 'zh', 'en']);
    const storage = new MemoryStorage();
    expect(readPreferences(storage, august).language).toBe('zh');
  });

  it('migrates a legacy explicit theme and ignores legacy reduced motion', () => {
    const storage = new MemoryStorage();
    storage.values.set('theme', 'dark');
    storage.values.set('reduce-motion', 'true');
    const preferences = readPreferences(storage, august);
    expect(preferences).toMatchObject({ themeMode: 'dark' });
    expect(preferences).not.toHaveProperty('reduceMotion');
  });

  it('filters unknown fields, deduplicates values and restores the required title field', () => {
    stubNavigatorLanguages(['zh-CN']);
    const storage = new MemoryStorage();
    storage.values.set(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        themeMode: 'light',
        visibleTransactionFields: ['profit', 'futureField', 'profit'],
        analysisMonth: '2026-03',
        language: 'en',
      }),
    );
    expect(readPreferences(storage, august)).toMatchObject({ language: 'en' });
    expect(readPreferences(storage, august).visibleTransactionFields).toEqual(['title', 'profit']);
  });

  it('falls back to zh when persisted language is invalid', () => {
    stubNavigatorLanguages(['en-US']);
    const storage = new MemoryStorage();
    storage.values.set(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        themeMode: 'light',
        visibleTransactionFields: ['title'],
        analysisMonth: '2026-08',
        language: 'fr',
      }),
    );
    expect(readPreferences(storage, august).language).toBe('zh');
  });

  it.each(['{bad json', JSON.stringify({ version: 99 })])(
    'falls back safely for invalid persisted data: %s',
    (raw) => {
      const storage = new MemoryStorage();
      storage.values.set(PREFERENCES_STORAGE_KEY, raw);
      expect(readPreferences(storage, august)).toMatchObject({
        themeMode: 'light',
        analysisMonth: '2026-08',
      });
    },
  );

  it('replaces an invalid month with the current local month', () => {
    stubNavigatorLanguages(['zh-CN']);
    const storage = new MemoryStorage();
    storage.values.set(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        themeMode: 'system',
        visibleTransactionFields: ['title'],
        analysisMonth: '2026-13',
      }),
    );
    expect(readPreferences(storage, august).analysisMonth).toBe('2026-08');
  });

  it('returns false instead of throwing when storage rejects writes', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('denied');
      },
    };
    const preferences = readPreferences(storage, august);
    expect(writePreferences(storage, preferences)).toBe(false);
  });
});
