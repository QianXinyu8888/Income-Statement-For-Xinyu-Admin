export interface SessionUser {
  username: string;
  role: string;
}
interface SessionPayload extends SessionUser {
  iat: number;
  exp: number;
}

const encoder = new TextEncoder();

function base64UrlEncode(value: Uint8Array | string): string {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const padded =
    value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signingKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createSessionToken(
  user: SessionUser,
  secret: string,
  now = Math.floor(Date.now() / 1000),
  ttlSeconds = 60 * 60 * 24 * 7,
): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({ ...user, iat: now, exp: now + ttlSeconds }));
  const input = `${header}.${payload}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(input)),
  );
  return `${input}.${base64UrlEncode(signature)}`;
}

export async function readSessionToken(
  token: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): Promise<SessionPayload | null> {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;
    const input = `${header}.${payload}`;
    const valid = await crypto.subtle.verify(
      'HMAC',
      await signingKey(secret),
      base64UrlDecode(signature).buffer as ArrayBuffer,
      encoder.encode(input),
    );
    if (!valid) return null;
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as SessionPayload;
    if (!parsed.username || !parsed.exp || parsed.exp <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string, secure = true): string {
  return [
    `xinyu_session=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=604800',
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function clearSessionCookie(secure = true): string {
  return [
    `xinyu_session=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get('cookie') ?? '';
  const item = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}
