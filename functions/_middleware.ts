export const onRequest: PagesFunction = async (context) => {
  const response = await context.next();
  const pathname = new URL(context.request.url).pathname;
  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? '';
  const isDocument =
    context.request.headers.get('Sec-Fetch-Dest') === 'document' ||
    contentType.startsWith('text/html');

  if (!pathname.startsWith('/api/') && !isDocument) return response;

  const newHeaders = new Headers(response.headers);
  newHeaders.set('Cache-Control', 'no-store');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};
