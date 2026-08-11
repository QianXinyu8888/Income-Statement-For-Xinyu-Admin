export function requestId(request: Request): string {
  return request.headers.get('cf-ray') ?? crypto.randomUUID();
}

export function jsonResponse(
  request: Request,
  data: unknown,
  status = 200,
  headers: HeadersInit = {},
): Response {
  return Response.json(
    { data, error: null, requestId: requestId(request) },
    {
      status,
      headers: { 'Cache-Control': 'no-store', ...headers },
    },
  );
}

export function errorResponse(
  request: Request,
  status: number,
  code: string,
  message: string,
): Response {
  return Response.json(
    { data: null, error: { code, message }, requestId: requestId(request) },
    {
      status,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

export function errorFromUnknown(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : '服务器暂时不可用';
  if (message.startsWith('缺少环境变量') || message.startsWith('SESSION_SECRET')) {
    return errorResponse(request, 503, 'CONFIGURATION_ERROR', '服务配置不完整');
  }
  if (message.includes('未知交易状态') || message.includes('无效')) {
    return errorResponse(request, 422, 'DATA_MAPPING_ERROR', message);
  }
  return errorResponse(request, 502, 'UPSTREAM_ERROR', '飞书服务暂时不可用');
}
