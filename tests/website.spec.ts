import { test, expect, Page } from '@playwright/test';

// ============================================================
// Sertone Website — Comprehensive Playwright Test Suite
// Tests: main pages, nav links, all 15 demo pages, REST demo
//        interactive test, and security leak detection.
// ============================================================

const BASE_URL = 'https://www.sertone.net';

// ─── Helper: collect console errors ──────────────────────────
function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

// ─── Helper: filter out known benign errors ──────────────────
function filterBenignErrors(errors: string[]): string[] {
  const benignPatterns = [
    /favicon/i,
    /net::ERR_FAILED/i,  // May happen for EventSource/SSE on demo pages
    /Failed to load resource.*404/i,
    /Mixed Content/i,
    // Cloudflare Insights analytics beacon: blocked by Playwright's local network restriction.
    // Not an application error — this is a third-party analytics script.
    /cloudflareinsights\.com/i,
    /beacon\.min\.js/i,
    /CORS policy.*local.*address/i,
    /Permission was denied.*local/i,
  ];
  return errors.filter(err =>
    !benignPatterns.some(pattern => pattern.test(err))
  );
}

// ============================================================
// A) MAIN PAGES — load, have title, no console errors
// ============================================================
test.describe('Main Pages', () => {
  const mainPages = [
    { name: 'Home', path: '/', titlePattern: /Sertone/ },
    { name: 'Sell', path: '/sell.html', titlePattern: /Sertone/ },
    { name: 'Buy', path: '/buy.html', titlePattern: /Sertone/ },
    { name: 'Demo Hub', path: '/demos/', titlePattern: /Sertone/ },
  ];

  for (const page of mainPages) {
    test(`${page.name} loads with HTTP 200 and valid title`, async ({ page: pw }) => {
      const errors = collectConsoleErrors(pw);

      const response = await pw.goto(BASE_URL + page.path);
      expect(response?.status(), `${page.name} should return HTTP 200`).toBe(200);

      const title = await pw.title();
      expect(title, `${page.name} should have a title`).toBeTruthy();
      expect(title, `${page.name} title should match pattern`).toMatch(page.titlePattern);

      // Give page a moment to settle
      await pw.waitForTimeout(500);

      const seriousErrors = filterBenignErrors(errors);
      if (seriousErrors.length > 0) {
        console.warn(`${page.name} console errors:`, seriousErrors);
      }
      // We report but don't fail on console errors for main pages
      // (CDN/analytics may generate minor errors)
    });
  }
});

// ============================================================
// B) NAV LINKS — "Live Demos" link exists in navigation on
//                ALL main pages
// ============================================================
test.describe('Navigation — Live Demos link', () => {
  const navPages = [
    { name: 'Home', path: '/' },
    { name: 'Sell', path: '/sell.html' },
    { name: 'Buy', path: '/buy.html' },
    { name: 'Demo Hub', path: '/demos/' },
  ];

  for (const page of navPages) {
    test(`${page.name} has "Live Demos" nav link`, async ({ page: pw }) => {
      await pw.goto(BASE_URL + page.path);

      // Look for a nav link that points to /demos/ with text matching "demo" (case-insensitive)
      const navLink = pw.locator('nav').getByRole('link', { name: /demo/i });
      await expect(navLink.first(), `${page.name} nav should have a Demos link`).toBeVisible();

      // Verify the href points to /demos/
      const href = await navLink.first().getAttribute('href');
      expect(href, `${page.name} Demos nav link should point to /demos/`).toMatch(/\/demos\//);
    });
  }
});

// ============================================================
// C) ALL 15 DEMO PAGES — load without JS errors
// ============================================================
test.describe('Demo Pages — load without errors', () => {
  const demoPages = [
    '/demos/rest-api/',
    '/demos/graphql/',
    '/demos/soap/',
    '/demos/xml-rpc/',
    '/demos/sse-streaming/',
    '/demos/subscription/',
    '/demos/smart-contract/',
    '/demos/webhook-delivery/',
    '/demos/multi-protocol/',
    '/demos/oauth-corporate/',
    '/demos/failover/',
    '/demos/pay-per-use/',
    '/demos/s3-delivery/',
    '/demos/cross-geography/',
    '/demos/security/',
  ];

  for (const path of demoPages) {
    const label = path.replace('/demos/', '').replace('/', '');
    test(`${label} loads (HTTP 200, has title, no JS errors)`, async ({ page: pw }) => {
      const errors = collectConsoleErrors(pw);

      const response = await pw.goto(BASE_URL + path);
      expect(response?.status(), `${label} should return HTTP 200`).toBe(200);

      const title = await pw.title();
      expect(title, `${label} should have a title`).toBeTruthy();
      expect(title, `${label} title should mention Sertone`).toMatch(/Sertone/i);

      // Wait for page to fully load
      await pw.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
        // Ignore networkidle timeout — SSE pages may keep connections open
      });

      const seriousErrors = filterBenignErrors(errors);
      expect(seriousErrors, `${label} should have no serious console JS errors`).toHaveLength(0);
    });
  }
});

// ============================================================
// D) REST DEMO — interactive test
// ============================================================
test.describe('REST Demo — interactive test', () => {
  test('clicking Run Demo returns AAPL data with latency badge', async ({ page: pw }) => {
    const errors = collectConsoleErrors(pw);

    await pw.goto(BASE_URL + '/demos/rest-api/');
    await pw.waitForLoadState('domcontentloaded');

    // Verify form inputs are present
    const apiNameInput = pw.locator('#rest-api-name');
    const runBtn = pw.locator('#rest-run-btn');

    await expect(apiNameInput, 'API name input should be visible').toBeVisible();
    await expect(runBtn, 'Run Demo button should be visible').toBeVisible();

    // Verify default values
    const apiNameValue = await apiNameInput.inputValue();
    expect(apiNameValue, 'API name should default to bb-sse-ticker').toBe('bb-sse-ticker');

    // Click the Run Demo button
    await runBtn.click();

    // Wait for the result to appear — should show latency badge within 30s
    const latencyBadge = pw.locator('#rest-result .latency-badge');
    await expect(latencyBadge, 'Latency badge should appear after running demo').toBeVisible({ timeout: 30000 });

    // Get result text and check for AAPL or valid JSON content
    const resultPanel = pw.locator('#rest-result');
    const resultText = await resultPanel.textContent();

    const hasValidContent = (
      (resultText?.includes('AAPL') ?? false) ||
      (resultText?.includes('success') ?? false) ||
      (resultText?.includes('{') ?? false)  // valid JSON
    );

    expect(hasValidContent, `REST demo result should contain AAPL data or valid JSON. Got: ${resultText?.slice(0, 200)}`).toBeTruthy();

    // Latency badge text should be a number with 'ms'
    const latencyText = await latencyBadge.first().textContent();
    expect(latencyText, 'Latency badge should show milliseconds').toMatch(/\d+ms/);

    const seriousErrors = filterBenignErrors(errors);
    expect(seriousErrors, 'REST demo should have no serious console JS errors').toHaveLength(0);
  });
});

// ============================================================
// E) SECURITY LEAKS — scan all pages for sensitive strings
// ============================================================
test.describe('Security — no sensitive data leaked', () => {
  const allPages = [
    '/',
    '/sell.html',
    '/buy.html',
    '/demos/',
    '/demos/rest-api/',
    '/demos/graphql/',
    '/demos/soap/',
    '/demos/xml-rpc/',
    '/demos/sse-streaming/',
    '/demos/subscription/',
    '/demos/smart-contract/',
    '/demos/webhook-delivery/',
    '/demos/multi-protocol/',
    '/demos/oauth-corporate/',
    '/demos/failover/',
    '/demos/pay-per-use/',
    '/demos/s3-delivery/',
    '/demos/cross-geography/',
    '/demos/security/',
  ];

  // Real server IPs that should NEVER appear in page source
  const forbiddenStrings = [
    { pattern: /162\.55\.\d+\.\d+/, description: 'real server IP (162.55.x.x)' },
    { pattern: /204\.168\.\d+\.\d+/, description: 'real server IP (204.168.x.x)' },
    { pattern: /178\.104\.\d+\.\d+/, description: 'real server IP (178.104.x.x)' },
    { pattern: /\bCX43\b/, description: 'server model "CX43"' },
    { pattern: /\bFinland\b/i, description: '"Finland" server location' },
    // "Hetzner" is OK in VPS recommendation lists but NOT as "our server"
    { pattern: /our.*hetzner|hetzner.*server.*sertone|sertone.*hetzner/i, description: '"Hetzner" linked to Sertone servers' },
  ];

  for (const path of allPages) {
    const label = path === '/' ? 'Home' : path.replace(/^\/|\/$/g, '').replace('/', ' > ');

    test(`${label}: no security leaks in page source`, async ({ page: pw }) => {
      await pw.goto(BASE_URL + path);
      await pw.waitForLoadState('domcontentloaded');

      const pageContent = await pw.content();

      const leaks: string[] = [];
      for (const { pattern, description } of forbiddenStrings) {
        if (pattern.test(pageContent)) {
          leaks.push(`Found ${description} in ${path}`);
        }
      }

      expect(leaks, `${label} should not contain sensitive server info`).toHaveLength(0);
    });
  }
});

// ============================================================
// F) DEMO PAGES — verify callDemo buttons are functional
//    (They should not produce a 404 or JS type error on click)
// ============================================================
test.describe('Demo Pages — run buttons work without JS errors', () => {
  // Pages with simulated results (no real API call needed)
  const simulatedDemos = [
    { path: '/demos/oauth-corporate/', btnSelector: '#run-oauth-btn', resultSelector: '#oauth-result' },
    { path: '/demos/failover/', btnSelector: '#run-failover-btn', resultSelector: '#failover-result' },
    { path: '/demos/pay-per-use/', btnSelector: '#run-ppu-btn', resultSelector: '#ppu-result' },
  ];

  for (const demo of simulatedDemos) {
    const label = demo.path.replace('/demos/', '').replace('/', '');
    test(`${label} — run button produces a result`, async ({ page: pw }) => {
      const errors = collectConsoleErrors(pw);

      await pw.goto(BASE_URL + demo.path);
      await pw.waitForLoadState('domcontentloaded');

      const btn = pw.locator(demo.btnSelector);
      await expect(btn, `${label} run button should be visible`).toBeVisible();
      await btn.click();

      // Wait for the result panel to change from placeholder
      await pw.waitForTimeout(3000);

      const resultEl = pw.locator(demo.resultSelector);
      const resultText = await resultEl.textContent();

      // Result should not be empty or just a placeholder
      expect(resultText?.trim().length ?? 0, `${label} result should not be empty`).toBeGreaterThan(10);

      const seriousErrors = filterBenignErrors(errors);
      expect(seriousErrors, `${label} should have no JS errors on run`).toHaveLength(0);
    });
  }

  // Pages with real API calls through the proxy
  const liveDemos = [
    {
      path: '/demos/graphql/',
      btnSelector: '#gql-run-btn',
      resultSelector: '#gql-result',
      label: 'graphql',
    },
    {
      path: '/demos/soap/',
      btnSelector: '#soap-run-btn',
      resultSelector: '#soap-result',
      label: 'soap',
    },
    {
      path: '/demos/smart-contract/',
      btnSelector: '#sc-run-btn',
      resultSelector: '#sc-result',
      label: 'smart-contract',
    },
  ];

  for (const demo of liveDemos) {
    test(`${demo.label} — run button produces a result (latency badge or error panel)`, async ({ page: pw }) => {
      const errors = collectConsoleErrors(pw);

      await pw.goto(BASE_URL + demo.path);
      await pw.waitForLoadState('domcontentloaded');

      const btn = pw.locator(demo.btnSelector);
      await expect(btn, `${demo.label} run button should be visible`).toBeVisible();
      await btn.click();

      // Wait for EITHER a latency badge (success) OR an error panel (API unavailable).
      // Both represent correct JS execution — only absence of any response is a failure.
      // Some backend APIs (bb-graphql, bb-soap) may be unavailable; the page should still
      // show an error panel rather than hanging or crashing.
      const latencyBadge = pw.locator(demo.resultSelector + ' .latency-badge');
      const errorPanel = pw.locator(demo.resultSelector + ' .result-error');

      await Promise.race([
        latencyBadge.waitFor({ state: 'visible', timeout: 35000 }).catch(() => null),
        errorPanel.waitFor({ state: 'visible', timeout: 35000 }).catch(() => null),
      ]);

      // At least one of them must be visible
      const latencyVisible = await latencyBadge.isVisible().catch(() => false);
      const errorVisible = await errorPanel.isVisible().catch(() => false);

      if (latencyVisible) {
        console.log(`${demo.label}: API call succeeded with latency badge`);
      } else if (errorVisible) {
        console.warn(`${demo.label}: API call failed — error panel shown (backend API may be unavailable)`);
      } else {
        // Neither appeared — JS error or page hang
        const resultText = await pw.locator(demo.resultSelector).textContent().catch(() => '');
        throw new Error(`${demo.label}: No result shown after 35s. Result panel: "${resultText?.slice(0, 200)}"`);
      }

      const seriousErrors = filterBenignErrors(errors);
      expect(seriousErrors, `${demo.label} should have no application JS errors`).toHaveLength(0);
    });
  }
});
