import { describe, expect, it } from 'vitest';
import { formatVersionUpdatedAt } from './version';

describe('version metadata', () => {
  it('formats the version update time to the minute in China Standard Time', () => {
    expect(formatVersionUpdatedAt('2026-09-11T09:01:13+08:00')).toBe('2026-09-11 09:01');
  });
});
