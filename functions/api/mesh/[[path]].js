export async function onRequest(context) {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const url = new URL(context.request.url);
  const targetPath = url.pathname.replace('/api/mesh/', '');
  // Catalog server (port 80) hosts the mesh endpoints
  const backend = context.env.MESH_BACKEND_URL || 'http://lancelot.sertone.net';
  const targetUrl = `${backend}/api/${targetPath}`;

  try {
    const response = await fetch(targetUrl, {
      method: context.request.method,
      headers: { 'Content-Type': 'application/json' },
      body: context.request.method !== 'GET' && context.request.method !== 'HEAD'
        ? context.request.body
        : undefined,
    });

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'application/json');
    responseHeaders.set('Access-Control-Allow-Origin', 'https://sertone.net');
    responseHeaders.set('Cache-Control', 'no-store');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Gateway unavailable — the demo gateway may be starting up.' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
