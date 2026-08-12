import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';

const input = {
  title: '同步测试',
  salePrice: 100,
  costPrice: 50,
  shippingFee: 5,
  status: '已售出' as const,
  purchaseDate: '2026-08-01',
  soldDate: '2026-08-02',
  note: null,
};

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

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/transactions/export',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });

  it('encodes a focused transaction id in the list request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { items: [], total: 0, page: 1, pageSize: 20, warnings: [] },
          error: null,
          requestId: 'req-2',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.transactions({
      page: 1,
      pageSize: 20,
      sort: 'soldDate',
      order: 'desc',
      focusId: 'record/2',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/transactions?page=1&pageSize=20&sort=soldDate&order=desc&focusId=record%2F2',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });

  it('uses the write endpoints for transaction CRUD and batch operations', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: { success: true, results: [] },
            error: null,
            requestId: 'req-3',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.createTransaction(input);
    await apiClient.updateTransaction('record/1', input);
    await apiClient.deleteTransaction('record/1');
    await apiClient.batchStatus(['record/1'], '在售中');
    await apiClient.batchDelete(['record/1']);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/transactions',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/transactions/record%2F1',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(input) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/v1/transactions/record%2F1',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/v1/transactions/batch-status',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ids: ['record/1'], status: '在售中' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      '/api/v1/transactions/batch-delete',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ids: ['record/1'] }),
      }),
    );
  });
});
