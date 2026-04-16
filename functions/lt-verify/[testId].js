// Used as the redirect target for /.well-known/loadtester-verify/* (see _redirects).
export async function onRequest({ params }) {
  const testId = params.testId || '';
  if (!/^[A-Za-z0-9_:.-]{1,128}$/.test(testId)) {
    return new Response('invalid testId', { status: 400 });
  }
  return new Response(testId, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
