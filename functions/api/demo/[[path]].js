export async function onRequest(context) {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Consumer-Key',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const url = new URL(context.request.url);
  const targetPath = url.pathname.replace('/api/demo/', '');
  // Dev env: CX43 (162.55.167.150:3006) — change to k3s demo server when migrating
  const demoBackend = context.env.DEMO_BACKEND_URL || 'http://162.55.167.150:3006';
  const queryString = url.search || '';
  const targetUrl = `${demoBackend}/${targetPath}${queryString}`;

  // For SSE (EventSource), stream the response
  const isSSE = targetPath.includes('bb-sse-ticker');

  try {
    const response = await fetch(targetUrl, {
      method: context.request.method,
      headers: {
        'Content-Type': context.request.headers.get('Content-Type') || 'application/json',
        'X-Forwarded-For': context.request.headers.get('CF-Connecting-IP') || '',
      },
      body: context.request.method !== 'GET' && context.request.method !== 'HEAD'
        ? context.request.body
        : undefined,
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, X-Consumer-Key');

    // For SSE, preserve content-type and cache-control
    if (isSSE) {
      responseHeaders.set('Content-Type', 'text/event-stream');
      responseHeaders.set('Cache-Control', 'no-cache');
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Demo backend unavailable', detail: err.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
