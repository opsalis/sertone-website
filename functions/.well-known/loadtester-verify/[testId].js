// Cloudflare Pages Function
// Serves LoadTester domain-ownership verification tokens for sertone.net.
// The verification protocol expects the response body to contain the testId string.
// This endpoint echoes back the testId so LoadTester self-tests can validate
// domain ownership for targets under sertone.net.
export async function onRequest({ params }) {
  const testId = params.testId || '';
  if (!/^[A-Za-z0-9_:.-]{1,128}$/.test(testId)) {
    return new Response('invalid testId', { status: 400 });
  }
  return new Response(testId, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
