// Cloudflare Pages Function — Waitlist API
// Stores emails in KV namespace "WAITLIST"
// Bind KV in wrangler.toml or Cloudflare Pages dashboard

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    if (!env.WAITLIST) {
      return new Response(JSON.stringify({ error: 'Waitlist service not configured. Please try again later.' }), { status: 503, headers });
    }

    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400, headers });
    }

    // Require consent
    if (!body.consent) {
      return new Response(JSON.stringify({ error: 'Privacy Policy consent is required' }), { status: 400, headers });
    }

    // Check if already registered
    const existing = await env.WAITLIST.get(email);
    if (existing) {
      return new Response(JSON.stringify({ ok: true, message: 'Already on the list' }), { status: 200, headers });
    }

    // Generate unsubscribe token
    const tokenBytes = new Uint8Array(24);
    crypto.getRandomValues(tokenBytes);
    const unsubToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    // Store in KV: key = email, value = JSON metadata
    // GDPR-minimal: only email, timestamp, consent, and unsubscribe token
    // No IP, no country, no user-agent
    const metadata = {
      email,
      ts: new Date().toISOString(),
      consent_ts: new Date().toISOString(),
      unsub_token: unsubToken,
    };

    await env.WAITLIST.put(email, JSON.stringify(metadata));

    return new Response(JSON.stringify({ ok: true, message: 'Welcome to the waitlist!' }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers });
  }
}

// Unsubscribe — GET /api/waitlist?unsubscribe=<token>
export async function onRequestGet(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    if (!env.WAITLIST) {
      return new Response(JSON.stringify({ error: 'Service not configured' }), { status: 503, headers });
    }

    const url = new URL(request.url);
    const token = url.searchParams.get('unsubscribe');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing unsubscribe token' }), { status: 400, headers });
    }

    // Scan KV for matching token
    // KV list returns keys; we check each for matching unsub_token
    const list = await env.WAITLIST.list();
    let found = false;

    for (const key of list.keys) {
      const val = await env.WAITLIST.get(key.name);
      if (val) {
        try {
          const data = JSON.parse(val);
          if (data.unsub_token === token) {
            await env.WAITLIST.delete(key.name);
            found = true;
            break;
          }
        } catch { /* skip malformed entries */ }
      }
    }

    if (found) {
      // Return simple HTML confirmation
      return new Response(
        '<html><body style="font-family:sans-serif;text-align:center;padding:4rem"><h2>Unsubscribed</h2><p>Your email has been permanently removed from our waitlist.</p><p><a href="/">Back to Sertone</a></p></body></html>',
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    return new Response(
      '<html><body style="font-family:sans-serif;text-align:center;padding:4rem"><h2>Token not found</h2><p>This unsubscribe link may have already been used or is invalid.</p><p><a href="/">Back to Sertone</a></p></body></html>',
      { status: 404, headers: { 'Content-Type': 'text/html' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
