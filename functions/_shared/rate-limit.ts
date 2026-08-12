const attempts = new Map<string, { count: number; resetsAt: number }>();

export function allowLogin(request: Request, now = Date.now()): boolean {
  const key = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const current = attempts.get(key);
  if (!current || current.resetsAt <= now) {
    attempts.set(key, { count: 1, resetsAt: now + 15 * 60 * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= 5;
}
