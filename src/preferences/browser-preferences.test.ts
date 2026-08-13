import { describe, expect, it } from 'vitest';
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

describe('browser preferences storage', () => {
  it('defaults a new browser to system theme, all fields, this month and full motion', () => {
    const storage = new MemoryStorage();
    expect(readPreferences(storage, august)).toEqual({
      version: 1,
      themeMode: 'system',
      visibleTransactionFields: ALL_TRANSACTION_FIELDS,
      analysisMonth: '2026-08',
      reduceMotion: false,
    });
  });

  it('migrates legacy explicit theme and reduced motion values', () => {
    const storage = new MemoryStorage();
    storage.values.set('theme', 'dark');
    storage.values.set('reduce-motion', 'true');
    expect(readPreferences(storage, august)).toMatchObject({
      themeMode: 'dark',
      reduceMotion: true,
    });
  });

  it('filters unknown fields, deduplicates values and restores the required title field', () => {
    const storage = new MemoryStorage();
    storage.values.set(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        themeMode: 'light',
        visibleTransactionFields: ['profit', 'futureField', 'profit'],
        analysisMonth: '2026-03',
        reduceMotion: false,
      }),
    );
    expect(readPreferences(storage, august).visibleTransactionFields).toEqual(['title', 'profit']);
  });

  it.each(['{bad json', JSON.stringify({ version: 99 })])(
    'falls back safely for invalid persisted data: %s',
    (raw) => {
      const storage = new MemoryStorage();
      storage.values.set(PREFERENCES_STORAGE_KEY, raw);
      expect(readPreferences(storage, august)).toMatchObject({
        themeMode: 'system',
        analysisMonth: '2026-08',
      });
    },
  );

  it('replaces an invalid month with the current local month', () => {
    const storage = new MemoryStorage();
    storage.values.set(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        themeMode: 'system',
        visibleTransactionFields: ['title'],
        analysisMonth: '2026-13',
        reduceMotion: false,
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
