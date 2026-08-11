import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('fails closed when a required secret is missing', () => {
    expect(() => parseEnv({})).toThrow('缺少环境变量');
  });

  it('accepts a complete Cloudflare environment', () => {
    expect(
      parseEnv({
        FEISHU_APP_ID: 'cli_1',
        FEISHU_APP_SECRET: 'secret',
        FEISHU_BITABLE_APP_TOKEN: 'app',
        FEISHU_TRANSACTIONS_TABLE_ID: 'transactions',
        FEISHU_USERS_TABLE_ID: 'users',
        SESSION_SECRET: 'a-session-secret-at-least-32-characters',
      }),
    ).toMatchObject({ transactionsTableId: 'transactions', usersTableId: 'users' });
  });
});
