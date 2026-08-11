export interface AppEnv {
  appId: string;
  appSecret: string;
  bitableAppToken: string;
  transactionsTableId: string;
  usersTableId: string;
  sessionSecret: string;
  allowedOrigin?: string;
}

type RawEnv = Record<string, unknown>;

export function parseEnv(env: RawEnv): AppEnv {
  const required = [
    'FEISHU_APP_ID',
    'FEISHU_APP_SECRET',
    'FEISHU_BITABLE_APP_TOKEN',
    'FEISHU_TRANSACTIONS_TABLE_ID',
    'FEISHU_USERS_TABLE_ID',
    'SESSION_SECRET',
  ] as const;
  const missing = required.filter((key) => !String(env[key] ?? '').trim());
  if (missing.length) throw new Error(`缺少环境变量：${missing.join(', ')}`);
  const sessionSecret = String(env.SESSION_SECRET);
  if (sessionSecret.length < 32) throw new Error('SESSION_SECRET 至少需要 32 个字符');
  return {
    appId: String(env.FEISHU_APP_ID),
    appSecret: String(env.FEISHU_APP_SECRET),
    bitableAppToken: String(env.FEISHU_BITABLE_APP_TOKEN),
    transactionsTableId: String(env.FEISHU_TRANSACTIONS_TABLE_ID),
    usersTableId: String(env.FEISHU_USERS_TABLE_ID),
    sessionSecret,
    allowedOrigin: env.ALLOWED_ORIGIN ? String(env.ALLOWED_ORIGIN) : undefined,
  };
}
