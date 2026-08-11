import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';

describe('apiClient export', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requests the dedicated unfiltered export endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { items: [], total: 0, warnings: [] },
          error: null,
          requestId: 'req-1',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.exportTransactions();

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/transactions/export',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });
});
