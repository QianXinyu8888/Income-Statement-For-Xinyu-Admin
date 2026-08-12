import type { AppEnv } from './env';
import { cookieValue, readSessionToken, type SessionUser } from './session';

export async function requireUser(request: Request, env: AppEnv): Promise<SessionUser | null> {
  const token = cookieValue(request, 'xinyu_session');
  if (!token) return null;
  return readSessionToken(token, env.sessionSecret);
}
