// Sertone Demo Worker — fully self-contained edge function
// All demo logic runs at Cloudflare edge. No backend server needed.
// Handles: bb-sse-ticker, bb-graphql, bb-smart-contract, bb-soap,
//          bb-xmlrpc, bb-webhook-receiver, bb-jsonrpc, earthquakes, weather, health

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Consumer-Key',
};

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function sertoneWrap(data) {
  return {
    ...data,
    _sertone: {
      routed_via: 'Sertone Global Network',
      consumer_node: 'Sertone (Frankfurt)',
      owner_node: 'Sertone (Finland)',
      latency_ms: 42 + Math.floor(Math.random() * 60),
      settled: true,
      price_usdc: '0.000200',
    },
  };
}

async function readBody(request) {
  try {
    const text = await request.text();
    return text ? JSON.parse(text) : {};
  } catch { return {}; }
}

async function handleSSETicker(url) {
  const symbol = url.searchParams.get('symbol') || 'AAPL';
  const basePrices = { AAPL: 198.50, GOOGL: 175.20, TSLA: 245.80, MSFT: 420.10, AMZN: 185.30 };
  let price = basePrices[symbol] || 100.00;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();

  (async () => {
    for (let i = 0; i < 25; i++) {
      const change = (Math.random() - 0.48) * 2.5;
      price = Math.max(1, price + change);
      const event = JSON.stringify({
        symbol, price: price.toFixed(2),
        change: (change >= 0 ? '+' : '') + change.toFixed(2),
        pct: (change / price * 100).toFixed(2) + '%',
        volume: Math.floor(Math.random() * 50000) + 10000,
        bid: (price - 0.02).toFixed(2),
        ask: (price + 0.02).toFixed(2),
        ts: Date.now(),
        _sertone: { routed: true, settled: true },
      });
      await writer.write(enc.encode('data: ' + event + '\n\n'));
      await new Promise(r => setTimeout(r, 1200));
    }
    await writer.write(enc.encode('data: {"symbol":"' + symbol + '","done":true}\n\n'));
    await writer.close();
  })();

  return new Response(readable, {
    status: 200,
    headers: {
      ...CORS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}

async function handleGraphQL(request) {
  return jsonResp(sertoneWrap({
    data: {
      exoplanets: [
        { name: 'Kepler-452b', distance_ly: 1402, radius_earth: 1.63, orbital_period_days: 384.8, star: 'Kepler-452' },
        { name: 'Proxima Centauri b', distance_ly: 4.2, radius_earth: 1.27, orbital_period_days: 11.2, star: 'Proxima Centauri' },
        { name: 'TRAPPIST-1e', distance_ly: 39, radius_earth: 0.92, orbital_period_days: 6.1, star: 'TRAPPIST-1' },
        { name: 'K2-18b', distance_ly: 124, radius_earth: 2.27, orbital_period_days: 33.0, star: 'K2-18' },
      ],
    },
  }));
}

async function handleSmartContract(request) {
  const body = await readBody(request);
  const reqBody = body.params || body;
  const fnName = reqBody.function || 'latestAnswer';
  const pair = reqBody.pair || 'ETH/USD';
  const chain = reqBody.chain || 84532;

  try {
    const cgResp = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd&include_24hr_change=true',
      { headers: { Accept: 'application/json' } }
    );
    const cgData = await cgResp.json();
    const ethPrice = cgData.ethereum && cgData.ethereum.usd ? cgData.ethereum.usd : 2298;
    const ethChange = cgData.ethereum && cgData.ethereum.usd_24h_change ? cgData.ethereum.usd_24h_change : 1.2;
    const btcPrice = cgData.bitcoin && cgData.bitcoin.usd ? cgData.bitcoin.usd : 74990;
    const btcChange = cgData.bitcoin && cgData.bitcoin.usd_24h_change ? cgData.bitcoin.usd_24h_change : 0.8;
    const prices = {
      'ETH/USD': { price: ethPrice, change: ethChange },
      'BTC/USD': { price: btcPrice, change: btcChange },
    };
    const p = prices[pair] || prices['ETH/USD'];
    return jsonResp(sertoneWrap({
      function: fnName, pair,
      answer: Math.round(p.price * 1e8),
      price: p.price,
      price_formatted: '$' + p.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      change_24h: (p.change >= 0 ? '+' : '') + p.change.toFixed(2) + '%',
      decimals: 8,
      round_id: Math.floor(Math.random() * 1000000) + 18000000,
      updated_at: new Date().toISOString(),
      source: 'Chainlink Oracle (via Sertone)',
      chain_id: chain,
      block: Math.floor(Math.random() * 1000000) + 15000000,
    }));
  } catch (e) {
    return jsonResp(sertoneWrap({
      function: fnName, pair,
      answer: 229800000000, price: 2298,
      price_formatted: '$2,298.00', change_24h: '+1.20%',
      decimals: 8, source: 'Chainlink Oracle (cached)', chain_id: chain,
    }));
  }
}

async function handleSOAP(request) {
  const body = await readBody(request);
  const reqBody = body.params || body;
  const operation = reqBody.operation || 'getBalance';
  const account = reqBody.account || 'demo-001';
  return jsonResp(sertoneWrap({
    soap_operation: operation, account,
    result: {
      balance: (1250.75 + Math.random() * 100).toFixed(2),
      currency: 'USD',
      last_transaction: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      status: 'active',
    },
    soap_envelope: '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><' + operation + 'Response><balance>1250.75</balance></' + operation + 'Response></s:Body></s:Envelope>',
  }));
}

async function handleXMLRPC(request) {
  const body = await readBody(request);
  const reqBody = body.params || body;
  const method = reqBody.method || 'wp.getPost';
  const id = reqBody.id || 1;
  return jsonResp(sertoneWrap({
    xmlrpc_method: method,
    result: {
      post_id: id,
      title: 'Hello World via Sertone',
      content: 'This post was retrieved via XML-RPC through the Sertone marketplace.',
      author: 'admin',
      date: new Date(Date.now() - 7 * 86400000).toISOString(),
      status: 'publish',
      categories: ['Technology', 'API'],
    },
  }));
}

async function handleWebhook(request) {
  const body = await readBody(request);
  const reqBody = body.params || body;
  return jsonResp(sertoneWrap({
    webhook_id: 'wh_' + Math.random().toString(36).substr(2, 12),
    status: 'received',
    action: reqBody.action || 'getStatus',
    payload: reqBody,
    received_at: new Date().toISOString(),
    delivery_confirmed: true,
    retries: 0,
  }));
}

async function handleJSONRPC(request) {
  const body = await readBody(request);
  const reqBody = body.params || body;
  const method = reqBody.method || 'getBlock';
  const rpcId = reqBody.id || 1;
  const hexNum = (Math.floor(Math.random() * 1000000) + 15000000).toString(16);
  const hexHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const hexTs = Math.floor(Date.now() / 1000).toString(16);
  const hexGas = Math.floor(Math.random() * 10000000).toString(16);
  const hexFee = Math.floor(Math.random() * 30).toString(16) + '000000';
  return jsonResp(sertoneWrap({
    jsonrpc: '2.0', id: rpcId,
    result: {
      number: '0x' + hexNum,
      hash: '0x' + hexHash,
      timestamp: '0x' + hexTs,
      transactions: Math.floor(Math.random() * 200) + 50,
      gasUsed: '0x' + hexGas,
      gasLimit: '0x1c9c380',
      baseFeePerGas: '0x' + hexFee,
    },
    method,
  }));
}

async function handleEarthquakes(url) {
  const minmag = url.searchParams.get('minmagnitude') || '5.0';
  const limit  = url.searchParams.get('limit') || '5';
  const days   = url.searchParams.get('days') || '30';
  const end = new Date();
  const start = new Date(end - days * 86400000);
  const usgsUrl = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=' + minmag + '&limit=' + limit + '&starttime=' + start.toISOString().slice(0, 10) + '&orderby=magnitude';
  try {
    const r = await fetch(usgsUrl);
    const data = await r.json();
    const features = data.features || [];
    return jsonResp(sertoneWrap({ type: 'FeatureCollection', count: features.length, features: features }));
  } catch (e) {
    return jsonResp({ error: 'Upstream unavailable', message: e.message }, 502);
  }
}

async function handleWeather(url) {
  const city = url.searchParams.get('city') || 'paris';
  const coords = {
    'paris':    { lat: 48.8566, lon: 2.3522,    name: 'Paris, France' },
    'new-york': { lat: 40.7128, lon: -74.0060,  name: 'New York, USA' },
    'tokyo':    { lat: 35.6762, lon: 139.6503,  name: 'Tokyo, Japan' },
    'london':   { lat: 51.5074, lon: -0.1278,   name: 'London, UK' },
    'sydney':   { lat: -33.8688, lon: 151.2093, name: 'Sydney, Australia' },
  };
  const c = coords[city] || coords['paris'];
  try {
    const wUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + c.lat + '&longitude=' + c.lon + '&current_weather=true';
    const r = await fetch(wUrl);
    const data = await r.json();
    const cw = data.current_weather || {};
    return jsonResp(sertoneWrap({
      city: c.name,
      temperature: cw.temperature !== undefined ? cw.temperature : null,
      windspeed: cw.windspeed !== undefined ? cw.windspeed : null,
      weathercode: cw.weathercode !== undefined ? cw.weathercode : null,
      unit: 'C / km/h',
    }));
  } catch (e) {
    return jsonResp({ error: e.message }, 502);
  }
}

// Subscription plans mirror the demo page's plan selector (monthly / annual).
const SUB_PLANS = {
  monthly: { price: '9.99', calls: 10000, days: 30 },
  annual: { price: '99.99', calls: 150000, days: 365 },
};

// handleSubscribe mocks the marketplace subscribe call: a consumer buys a metered plan for an API,
// the settlement contract records it, and a subscription token is issued. Shape matches what the
// subscription demo renders (subscription_token, plan, calls_limit, expires_at, tx_hash).
async function handleSubscribe(request) {
  const body = await readBody(request);
  const reqBody = body.params || body;
  const plan = SUB_PLANS[reqBody.plan] ? reqBody.plan : 'monthly';
  const p = SUB_PLANS[plan];
  const token = 'sub_' + Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
  const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return jsonResp(sertoneWrap({
    status: 'active',
    subscription_token: token,
    plan,
    api_id: reqBody.api_id || 'demo-api',
    price_usdc: p.price,
    calls_limit: p.calls,
    calls_remaining: p.calls,
    expires_at: new Date(Date.now() + p.days * 86400000).toISOString(),
    tx_hash: txHash,
  }));
}

// handleSubscriptionStatus mocks the status check for an active subscription (no metered usage yet,
// so calls_used starts at 0). The demo passes plan/api_id via params; unknown plan falls back sanely.
async function handleSubscriptionStatus(request) {
  const body = await readBody(request);
  const reqBody = body.params || body;
  const plan = SUB_PLANS[reqBody.plan] ? reqBody.plan : 'monthly';
  const p = SUB_PLANS[plan];
  const used = reqBody.calls_used || 0;
  return jsonResp(sertoneWrap({
    status: 'active',
    plan,
    api_id: reqBody.api_id || 'demo-api',
    calls_used: used,
    calls_remaining: Math.max(0, p.calls - used),
    calls_limit: p.calls,
    expires_at: new Date(Date.now() + p.days * 86400000).toISOString(),
    days_remaining: p.days,
  }));
}

// handleGRPC mocks a gRPC unary call (the multi-protocol demo's UserService.GetUser). The demo
// sends the request message as params ({ user_id: 42 }); we echo a protobuf-shaped OK response so
// the "run all 6 protocols in parallel" comparison has a real gRPC row.
async function handleGRPC(request) {
  const body = await readBody(request);
  const reqBody = body.params || body;
  const userId = reqBody.user_id || reqBody.id || 42;
  return jsonResp(sertoneWrap({
    service: 'UserService',
    method: 'GetUser',
    status: 'OK',
    status_code: 0,
    encoding: 'protobuf',
    response: {
      user_id: userId,
      name: 'Ada Lovelace',
      email: 'user' + userId + '@example.com',
      created_at: new Date(Date.now() - 86400000 * 400).toISOString(),
      active: true,
    },
  }));
}

// handleREST mocks a plain REST resource — a stock quote, matching the rest-api demo's default
// POST /quote/AAPL. It reads the symbol from the request path so a visitor editing the endpoint
// (/quote/TSLA) gets that symbol back. Fast + self-contained (no upstream), so the flagship demo
// never blocks: it previously defaulted to the SSE ticker, whose event-stream body cannot be parsed
// by callDemo's response.json() and hung to the 25s timeout.
async function handleREST(request) {
  const body = await readBody(request);
  const path = body.path || '/quote/AAPL';
  const m = path.match(/\/quote\/([A-Za-z.\-]+)/);
  const symbol = (m ? m[1] : 'AAPL').toUpperCase();
  const base = { AAPL: 198.5, GOOGL: 175.2, TSLA: 245.8, MSFT: 420.1, AMZN: 185.3 }[symbol] || 100;
  const price = +(base + (Math.random() - 0.5) * 4).toFixed(2);
  const change = +((Math.random() - 0.45) * 3).toFixed(2);
  return jsonResp(sertoneWrap({
    symbol,
    price,
    currency: 'USD',
    change,
    change_pct: +((change / price) * 100).toFixed(2),
    volume: Math.floor(Math.random() * 5000000) + 500000,
    market: 'NASDAQ',
    as_of: new Date().toISOString(),
  }));
}

// handleMCP mocks an MCP tool call. Each catalog API becomes an MCP tool (one per endpoint), named
// like Crypto_Prices_getPrice; an AI agent (e.g. Claude) calls the tool, the control center routes
// it and settles USDC, and returns the result. The demo lets a visitor invoke a tool the way an
// agent would. Two tools are modeled: Crypto_Prices_getPrice({symbol}) and
// Weather_API_getForecast({city, days}).
async function handleMCP(request) {
  const body = await readBody(request);
  const reqBody = body.params || body;
  const tool = reqBody.tool || 'Crypto_Prices_getPrice';
  const args = reqBody.arguments || reqBody.args || reqBody;
  let result;
  if (tool === 'Weather_API_getForecast') {
    const city = args.city || 'Tokyo';
    const days = Math.min(Math.max(parseInt(args.days, 10) || 5, 1), 7);
    const conditions = ['Sunny', 'Partly cloudy', 'Cloudy', 'Light rain', 'Clear'];
    const forecast = Array.from({ length: days }, (_, i) => {
      const hi = 18 + Math.floor(Math.random() * 12);
      return { day: i + 1, high_c: hi, low_c: hi - 6 - Math.floor(Math.random() * 4), condition: conditions[Math.floor(Math.random() * conditions.length)] };
    });
    result = { city, unit: 'C', days, forecast };
  } else {
    const symbol = String(args.symbol || 'BTC').toUpperCase();
    const base = { BTC: 64200, ETH: 3120, SOL: 145.6, USDC: 1.0, DOGE: 0.16 }[symbol] || 100 + Math.random() * 500;
    const price = +(base * (1 + (Math.random() - 0.5) * 0.02)).toFixed(2);
    result = { symbol, price_usd: price, change_24h_pct: +((Math.random() - 0.45) * 6).toFixed(2), as_of: new Date().toISOString() };
    tool === 'Crypto_Prices_getPrice' || (result.note = 'unknown tool; defaulted to Crypto_Prices_getPrice');
  }
  return jsonResp(sertoneWrap({
    protocol: 'mcp',
    tool,
    arguments: args && typeof args === 'object' && !args.tool ? args : {},
    is_error: false,
    result,
  }));
}

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(context.request.url);
  // Strip /api/demo prefix; remainder is like 'health', 'api/bb-graphql', etc.
  const path = url.pathname.replace(/^\/api\/demo\/?/, '');

  if (path === 'health' || path === '' || path === '/') {
    return jsonResp({ status: 'ok', server: 'sertone-demo-edge', version: '2.0.0', timestamp: Date.now() });
  }
  if (path === 'api/bb-sse-ticker')       return handleSSETicker(url);
  if (path === 'api/bb-graphql')          return handleGraphQL(context.request);
  if (path === 'api/bb-smart-contract')   return handleSmartContract(context.request);
  if (path === 'api/bb-soap')             return handleSOAP(context.request);
  if (path === 'api/bb-xmlrpc')           return handleXMLRPC(context.request);
  if (path === 'api/bb-webhook-receiver') return handleWebhook(context.request);
  if (path === 'api/bb-jsonrpc')          return handleJSONRPC(context.request);
  if (path === 'api/bb-grpc')             return handleGRPC(context.request);
  if (path === 'api/bb-rest')             return handleREST(context.request);
  if (path === 'api/bb-mcp')              return handleMCP(context.request);
  if (path === 'api/earthquakes')         return handleEarthquakes(url);
  if (path === 'api/weather')             return handleWeather(url);
  if (path === 'api/subscribe')           return handleSubscribe(context.request);
  if (path === 'api/subscription/status') return handleSubscriptionStatus(context.request);

  return jsonResp({ error: 'Not found', path }, 404);
}
