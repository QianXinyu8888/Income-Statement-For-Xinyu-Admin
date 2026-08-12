import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppEnv } from './env';
import { listRecords } from './feishu';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listRecords', () => {
  it('binds transaction reads to the configured Feishu grid view', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 0, tenant_access_token: 'token', expire: 7200 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 0, data: { items: [], has_more: false } }), {
          status: 200,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const env = {
      appId: 'app',
      appSecret: 'secret',
      bitableAppToken: 'base',
      transactionsTableId: 'table',
      transactionsViewId: 'view',
      usersTableId: 'users',
      sessionSecret: 'a-session-secret-at-least-32-characters',
    } as AppEnv & { transactionsViewId: string };

    await listRecords(env);

    expect(fetchMock.mock.calls[1]?.[0]).toContain('view_id=view');
  });
});
