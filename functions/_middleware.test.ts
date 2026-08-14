// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { onRequest } from './_middleware';

function runMiddleware(request: Request, response: Response) {
  const next = vi.fn().mockResolvedValue(response);
  type MiddlewareContext = Parameters<typeof onRequest>[0];
  const context: MiddlewareContext = {
    request: request as unknown as MiddlewareContext['request'],
    functionPath: '/_middleware',
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
    next,
    env: { ASSETS: { fetch } },
    params: {},
    data: {},
  };
  return onRequest(context);
}

describe('cache middleware', () => {
  it('adds no-store to API responses', async () => {
    const response = await runMiddleware(
      new Request('https://example.com/api/v1/analytics/summary'),
      new Response('{}', { headers: { 'Content-Type': 'application/json' } }),
    );

    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it('adds no-store to HTML document responses', async () => {
    const response = await runMiddleware(
      new Request('https://example.com/overview'),
      new Response('<!doctype html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    );

    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it('preserves hashed static asset caching headers', async () => {
    const assetResponse = new Response('body {}', {
      headers: {
        'Content-Type': 'text/css',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

    const response = await runMiddleware(
      new Request('https://example.com/assets/index-abc.css'),
      assetResponse,
    );

    expect(response).toBe(assetResponse);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect(response.headers.has('Pragma')).toBe(false);
    expect(response.headers.has('Expires')).toBe(false);
  });
});
