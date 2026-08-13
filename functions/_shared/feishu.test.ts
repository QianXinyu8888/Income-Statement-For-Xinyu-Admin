import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppEnv } from './env';
import { listRecords, listUsers } from './feishu';

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

describe('listUsers', () => {
  it('reads every page of the system users table', async () => {
    const firstUser = { record_id: 'first', fields: { 用户名: 'first' } };
    const secondUser = { record_id: 'second', fields: { 用户名: 'second' } };
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/auth/v3/tenant_access_token/internal')) {
        return Promise.resolve(
          new Response(JSON.stringify({ code: 0, tenant_access_token: 'token', expire: 7200 }), {
            status: 200,
          }),
        );
      }
      if (url.includes('page_token=next-page')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ code: 0, data: { items: [secondUser], has_more: false } }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            code: 0,
            data: { items: [firstUser], has_more: true, page_token: 'next-page' },
          }),
          { status: 200 },
        ),
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const env = {
      appId: 'app',
      appSecret: 'secret',
      bitableAppToken: 'base',
      transactionsTableId: 'table',
      transactionsViewId: 'view',
      usersTableId: 'users',
      sessionSecret: 'a-session-secret-at-least-32-characters',
    } as AppEnv;

    await expect(listUsers(env)).resolves.toEqual([firstUser, secondUser]);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('page_token=next-page'))).toBe(
      true,
    );
  });
});
