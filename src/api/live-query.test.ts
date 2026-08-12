import { describe, expect, it } from 'vitest';
import { LIVE_QUERY_INTERVAL_MS, LIVE_QUERY_OPTIONS } from './live-query';

describe('live Feishu query options', () => {
  it('refreshes visible live-data queries every 15 seconds', () => {
    expect(LIVE_QUERY_INTERVAL_MS).toBe(15_000);
    expect(LIVE_QUERY_OPTIONS).toEqual({
      refetchInterval: 15_000,
      refetchIntervalInBackground: false,
    });
  });
});
