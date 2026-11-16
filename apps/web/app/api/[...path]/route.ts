import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const base = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');
  const url = `${base}/api/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  const response = await fetch(url, { method: request.method, headers, body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(), redirect: 'manual', cache: 'no-store' });
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');
  responseHeaders.set('Cache-Control', 'private, no-store');
  responseHeaders.set('Referrer-Policy', 'no-referrer');
  return new Response(response.body, { status: response.status, headers: responseHeaders });
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
