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
        const status =
          typeof fields['状态'] === 'object' && fields['状态'] !== null
            ? String((fields['状态'] as { name?: unknown }).name ?? '')
            : String(fields['状态'] ?? '正常');
        return (
          String(fields['用户名'] ?? '').trim() === username &&
          String(fields['密码'] ?? '') === password &&
          status !== '禁用'
        );
      });
      if (!matched) return errorResponse(request, 401, 'INVALID_CREDENTIALS', '账号或密码错误');
      const roleValue = matched.fields?.['角色'];
      const role =
        typeof roleValue === 'object' && roleValue !== null
          ? String((roleValue as { name?: unknown }).name ?? '用户')
          : String(roleValue ?? '用户');
      const user = { username, role };
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
      const user = await requireUser(request, config);
      return user
        ? jsonResponse(request, { user })
        : errorResponse(request, 401, 'UNAUTHENTICATED', '请重新登录');
    }
    return errorResponse(request, 404, 'NOT_FOUND', '接口不存在');
  } catch (error) {
    if (error instanceof z.ZodError)
      return errorResponse(request, 400, 'VALIDATION_ERROR', '请输入账号和密码');
    return errorFromUnknown(request, error);
  }
};
