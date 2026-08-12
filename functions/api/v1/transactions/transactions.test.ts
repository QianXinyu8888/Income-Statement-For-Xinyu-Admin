import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSessionToken } from '../../../_shared/session';

const sessionSecret = 'a-session-secret-at-least-32-characters';
const env = {
  FEISHU_APP_ID: 'cli_test',
  FEISHU_APP_SECRET: 'secret',
  FEISHU_BITABLE_APP_TOKEN: 'app',
  FEISHU_TRANSACTIONS_TABLE_ID: 'transactions',
  FEISHU_TRANSACTIONS_VIEW_ID: 'view',
  FEISHU_USERS_TABLE_ID: 'users',
  SESSION_SECRET: sessionSecret,
};
const input = {
  title: '同步测试',
  salePrice: 100,
  costPrice: 50,
  shippingFee: 5,
  status: '已售出',
  purchaseDate: '2026-08-01',
  soldDate: '2026-08-02',
  note: null,
};

function feishuResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ code: status === 200 ? 0 : status, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function request(method: string, path = '', body?: unknown) {
  const token = await createSessionToken({ username: 'tester', role: '管理员' }, sessionSecret);
  return new Request(`https://example.test/api/v1/transactions${path}`, {
    method,
    headers: {
      Cookie: `xinyu_session=${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function invoke(method: string, path = '', body?: unknown) {
  const { onRequest } = await import('./[[path]]');
  const routePath = path.split('?')[0];
  const response = await onRequest({
    request: await request(method, path, body),
    env,
    params: { path: routePath.replace(/^\//, '').split('/').filter(Boolean) },
  } as unknown as Parameters<typeof onRequest>[0]);
  return response as Response;
}

describe('transactions Pages Function', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('reads records from the configured Feishu view', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(feishuResponse({ tenant_access_token: 'tenant-token', expire: 7200 }))
      .mockResolvedValueOnce(
        feishuResponse({
          items: [{ record_id: 'record-1', fields: { 商品名称: '已同步', 交易状态: '已售出' } }],
          has_more: false,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const response = await invoke('GET', '?page=1&pageSize=20');
    const payload = (await response.json()) as {
      data: { items: Array<{ id: string; title: string | null }> };
    };

    expect(response.status).toBe(200);
    expect(payload.data.items[0]).toMatchObject({ id: 'record-1', title: '已同步' });
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('view_id=view'),
      expect.any(Object),
    );
  });

  it('creates a Feishu record with the writable fields', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(feishuResponse({ tenant_access_token: 'tenant-token', expire: 7200 }))
      .mockResolvedValueOnce(
        feishuResponse({ record: { record_id: 'record-1', fields: { 商品名称: input.title } } }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const response = await invoke('POST', '', input);
    const [, init] = fetchMock.mock.calls.at(-1)!;

    expect(response.status).toBe(201);
    expect(init).toMatchObject({ method: 'POST' });
    expect(JSON.parse(String(init.body))).toMatchObject({
      fields: { 商品名称: input.title, '成交价(¥)': 100, 交易状态: '已售出' },
    });
  });

  it('updates and deletes the addressed Feishu record', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(feishuResponse({ tenant_access_token: 'tenant-token', expire: 7200 }))
      .mockResolvedValueOnce(
        feishuResponse({ record: { record_id: 'record-1', fields: { 商品名称: input.title } } }),
      )
      .mockResolvedValueOnce(feishuResponse({}));
    vi.stubGlobal('fetch', fetchMock);

    expect((await invoke('PUT', '/record-1', input)).status).toBe(200);
    expect((await invoke('DELETE', '/record-1')).status).toBe(200);

    expect(fetchMock.mock.calls[1]).toEqual([
      expect.stringContaining('/records/record-1'),
      expect.objectContaining({ method: 'PUT' }),
    ]);
    expect(fetchMock.mock.calls[2]).toEqual([
      expect.stringContaining('/records/record-1'),
      expect.objectContaining({ method: 'DELETE' }),
    ]);
  });

  it('reports partial failures for batch status updates', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/auth/v3/tenant_access_token/internal')) {
        return Promise.resolve(
          feishuResponse({ tenant_access_token: 'tenant-token', expire: 7200 }),
        );
      }
      if (url.endsWith('/records/good')) {
        return Promise.resolve(
          feishuResponse({ record: { record_id: 'good', fields: { 交易状态: '在售中' } } }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ code: 500, msg: 'failed' }), { status: 500 }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await invoke('POST', '/batch-status', {
      ids: ['good', 'bad'],
      status: '在售中',
    });
    const payload = (await response.json()) as {
      data: { results: Array<{ id: string; success: boolean; message?: string }> };
    };

    expect(response.status).toBe(200);
    expect(payload.data.results).toEqual([
      { id: 'good', success: true },
      { id: 'bad', success: false, message: '操作失败' },
    ]);
  });
});
