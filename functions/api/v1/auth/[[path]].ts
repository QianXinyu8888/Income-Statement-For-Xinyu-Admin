import { z } from 'zod';
import { parseEnv } from '../../../_shared/env';
import { errorFromUnknown, errorResponse, jsonResponse } from '../../../_shared/http';
import { listUsers } from '../../../_shared/feishu';
import { allowLogin } from '../../../_shared/rate-limit';
import { clearSessionCookie, createSessionToken, sessionCookie } from '../../../_shared/session';
import { requireUser } from '../../../_shared/auth';

const credentialsSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

function routePath(value: unknown): string {
  return Array.isArray(value) ? value.join('/') : String(value ?? '');
}

function fieldText(value: unknown, fallback = ''): string {
  const scalar =
    typeof value === 'object' && value !== null && 'name' in value
      ? (value as { name?: unknown }).name
      : value;
  return String(scalar ?? fallback).trim() || fallback;
}

function activeUserRecord(users: Awaited<ReturnType<typeof listUsers>>, username: string) {
  return users.find(({ fields = {} }) => {
    return fieldText(fields['用户名']) === username && fieldText(fields['状态'], '正常') !== '禁用';
  });
}

function userRole(fields: Record<string, unknown> = {}): string {
  return fieldText(fields['角色'], '用户');
}

export const onRequest: PagesFunction = async ({ request, env, params }) => {
  const path = routePath(params.path);
  try {
    const config = parseEnv(env);
    if (path === 'login' && request.method === 'POST') {
      if (!allowLogin(request))
        return errorResponse(request, 429, 'RATE_LIMITED', '尝试次数过多，请稍后再试');
      const { username, password } = credentialsSchema.parse(await request.json());
      const users = await listUsers(config);
      const matched = users.find(({ fields = {} }) => {
        return (
          fieldText(fields['用户名']) === username &&
          String(fields['密码'] ?? '') === password &&
          fieldText(fields['状态'], '正常') !== '禁用'
        );
      });
      if (!matched) return errorResponse(request, 401, 'INVALID_CREDENTIALS', '账号或密码错误');
      const user = { username, role: userRole(matched.fields) };
      const token = await createSessionToken(user, config.sessionSecret);
      return jsonResponse(request, { user }, 200, {
        'Set-Cookie': sessionCookie(token, new URL(request.url).protocol === 'https:'),
      });
    }
    if (path === 'logout' && request.method === 'POST') {
      return jsonResponse(request, { success: true }, 200, {
        'Set-Cookie': clearSessionCookie(new URL(request.url).protocol === 'https:'),
      });
    }
    if (path === 'session' && request.method === 'GET') {
      const sessionUser = await requireUser(request, config);
      if (!sessionUser) return errorResponse(request, 401, 'UNAUTHENTICATED', '请重新登录');
      const matched = activeUserRecord(await listUsers(config), sessionUser.username);
      if (!matched) return errorResponse(request, 401, 'ACCOUNT_UNAVAILABLE', '账号不存在或已禁用');
      return jsonResponse(request, {
        user: { username: sessionUser.username, role: userRole(matched.fields) },
      });
    }
    return errorResponse(request, 404, 'NOT_FOUND', '接口不存在');
  } catch (error) {
    if (error instanceof z.ZodError)
      return errorResponse(request, 400, 'VALIDATION_ERROR', '请输入账号和密码');
    return errorFromUnknown(request, error);
  }
};
