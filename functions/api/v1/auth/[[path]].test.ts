// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listUsers: vi.fn(),
  parseEnv: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock('../../../_shared/env', () => ({ parseEnv: mocks.parseEnv }));
vi.mock('../../../_shared/feishu', () => ({ listUsers: mocks.listUsers }));
vi.mock('../../../_shared/auth', () => ({ requireUser: mocks.requireUser }));

import { onRequest } from './[[path]]';

const config = {
  appId: 'app-id',
  appSecret: 'app-secret',
  bitableAppToken: 'app-token',
  transactionsTableId: 'transactions-table',
  transactionsViewId: 'transactions-view',
  usersTableId: 'system-users-table',
  sessionSecret: 'a-secret-long-enough-for-tests-123',
};

async function requestSession() {
  return onRequest({
    request: new Request('https://example.com/api/v1/auth/session'),
    env: {},
    params: { path: ['session'] },
  } as never);
}

describe('auth session role refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.parseEnv.mockReturnValue(config);
    mocks.requireUser.mockResolvedValue({ username: 'xinyu', role: '用户' });
  });

  it('returns the latest role from the active system user record', async () => {
    mocks.listUsers.mockResolvedValue([
      {
        fields: {
          用户名: 'xinyu',
          状态: { name: '正常' },
          角色: { name: '管理员' },
        },
      },
    ]);

    const response = await requestSession();
    const payload = (await response.json()) as {
      data: { user: { username: string; role: string } };
    };

    expect(response.status).toBe(200);
    expect(payload.data.user).toEqual({ username: 'xinyu', role: '管理员' });
    expect(mocks.listUsers).toHaveBeenCalledOnce();
  });

  it('defaults an empty role to 用户', async () => {
    mocks.listUsers.mockResolvedValue([{ fields: { 用户名: 'xinyu', 状态: '正常', 角色: '  ' } }]);

    const response = await requestSession();
    const payload = (await response.json()) as {
      data: { user: { username: string; role: string } };
    };

    expect(payload.data.user.role).toBe('用户');
  });

  it.each([
    ['missing', []],
    ['disabled', [{ fields: { 用户名: 'xinyu', 状态: { name: '禁用' }, 角色: '管理员' } }]],
  ])('rejects a %s system user record', async (_case, users) => {
    mocks.listUsers.mockResolvedValue(users);

    const response = await requestSession();
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(payload.error.code).toBe('ACCOUNT_UNAVAILABLE');
  });
});
