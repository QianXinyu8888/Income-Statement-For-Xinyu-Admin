import type { AppEnv } from './env';
import type { FeishuRecord } from '../../src/domain/transaction';

let tokenCache: { token: string; expiresAt: number } | null = null;

async function feishuJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as { code?: number; msg?: string } & T;
  if (!response.ok || payload.code !== 0)
    throw new Error(payload.msg || `飞书请求失败 (${response.status})`);
  return payload;
}

async function tenantToken(env: AppEnv): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now) return tokenCache.token;
  const response = await fetch(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: env.appId, app_secret: env.appSecret }),
    },
  );
  const payload = await feishuJson<{ tenant_access_token: string; expire?: number }>(response);
  tokenCache = {
    token: payload.tenant_access_token,
    expiresAt: now + Math.max(60, (payload.expire ?? 7200) - 300) * 1000,
  };
  return payload.tenant_access_token;
}

async function request<T>(env: AppEnv, path: string, init: RequestInit = {}): Promise<T> {
  const token = await tenantToken(env);
  return feishuJson<T>(
    await fetch(`https://open.feishu.cn/open-apis${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    }),
  );
}

function recordsPath(env: AppEnv) {
  return `/bitable/v1/apps/${env.bitableAppToken}/tables/${env.transactionsTableId}/records`;
}

export async function listRecords(env: AppEnv): Promise<FeishuRecord[]> {
  const records: FeishuRecord[] = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({ page_size: '500' });
    if (pageToken) params.set('page_token', pageToken);
    const payload = await request<{
      data?: { items?: FeishuRecord[]; has_more?: boolean; page_token?: string };
    }>(env, `${recordsPath(env)}?${params}`);
    records.push(...(payload.data?.items ?? []));
    pageToken = payload.data?.has_more ? (payload.data.page_token ?? '') : '';
  } while (pageToken);
  return records;
}

export async function listUsers(env: AppEnv): Promise<FeishuRecord[]> {
  const path = `/bitable/v1/apps/${env.bitableAppToken}/tables/${env.usersTableId}/records?page_size=500`;
  const payload = await request<{ data?: { items?: FeishuRecord[] } }>(env, path);
  return payload.data?.items ?? [];
}

export async function createRecord(
  env: AppEnv,
  fields: Record<string, unknown>,
): Promise<FeishuRecord> {
  const payload = await request<{ data?: { record?: FeishuRecord } }>(env, recordsPath(env), {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
  if (!payload.data?.record) throw new Error('飞书未返回新增记录');
  return payload.data.record;
}

export async function updateRecord(
  env: AppEnv,
  id: string,
  fields: Record<string, unknown>,
): Promise<FeishuRecord> {
  const payload = await request<{ data?: { record?: FeishuRecord } }>(
    env,
    `${recordsPath(env)}/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ fields }),
    },
  );
  if (!payload.data?.record) throw new Error('飞书未返回更新记录');
  return payload.data.record;
}

export async function deleteRecord(env: AppEnv, id: string): Promise<void> {
  await request(env, `${recordsPath(env)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
