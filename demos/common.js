/* ============================================================
   Sertone Demo Pages — Shared JavaScript
   API client, result renderer, timing, error handling, code tabs
   ============================================================ */

// API client — calls via Cloudflare Pages proxy to avoid CORS/IP exposure
const DEMO_API_BASE = '/api/demo';

/**
 * Call a demo API endpoint through the proxy.
 * @param {string} apiName - API name (e.g., "bb-sse-ticker")
 * @param {object} params - API-specific parameters (query params or body fields)
 * @param {object} options - { method, path, headers }
 *   method: the target API method (GET, POST, etc.) — sent in body, proxy always uses POST
 *   path: the target API path (e.g., "/quote/AAPL") — sent in body
 * @returns {Promise<{data: object, latency: number, status: number}>}
 */
async function callDemo(apiName, params, options = {}) {
  const startTime = performance.now();
  const headers = {
    'Content-Type': 'application/json',
    'X-Consumer-Key': 'demo-public-key-2026',
    ...options.headers
  };

  // Always POST to the proxy — target method/path are in the body.
  // The subscription endpoint's proxyToInternalCall reads body.method and body.path.
  const body = {
    method: options.method || 'GET',
    path: options.path || '/',
    params: params || {},
  };

  // 25s timeout — prevents demo pages hanging indefinitely if backend API is unavailable.
  const controller = new AbortController();
  const timeoutId = setTimeout(function() { controller.abort(); }, 25000);

  let response;
  try {
    response = await fetch(DEMO_API_BASE + '/api/' + apiName, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - startTime);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out after 25s — API endpoint may be unavailable');
    }
    throw err;
  }
  clearTimeout(timeoutId);
  const latency = Math.round(performance.now() - startTime);
  const data = await response.json();
  return { data, latency, status: response.status };
}

/**
 * Render API result into a result panel.
 * @param {string} containerId - ID of the result panel element
 * @param {object} result - { data, latency, status }
 */
function renderResult(containerId, result) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const latencyClass = result.latency < 200 ? 'fast' : result.latency < 500 ? 'medium' : 'slow';

  el.innerHTML =
    '<div class="result-header">' +
      '<span class="latency-badge ' + latencyClass + '">' + result.latency + 'ms</span>' +
      '<span class="status-badge">HTTP ' + result.status + '</span>' +
    '</div>' +
    '<pre><code>' + escapeHtml(JSON.stringify(result.data, null, 2)) + '</code></pre>';
}

/**
 * Display timing information.
 * @param {string} containerId - ID of the container element
 * @param {number} ms - Latency in milliseconds
 */
function showTiming(containerId, ms) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const latencyClass = ms < 200 ? 'fast' : ms < 500 ? 'medium' : 'slow';
  el.innerHTML = '<span class="latency-badge ' + latencyClass + '">' + ms + 'ms</span>';
}

/**
 * Display an error in the result panel.
 * @param {string} containerId - ID of the result panel element
 * @param {Error|string} error - Error object or message
 */
function showError(containerId, error) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const message = error instanceof Error ? error.message : String(error);
  el.innerHTML =
    '<div class="result-error">' +
      '<div class="error-title">Request Failed</div>' +
      '<div class="error-detail">' + escapeHtml(message) + '</div>' +
    '</div>';
}

/**
 * Initialize code tab switching for all .code-tabs groups on the page.
 */
function initCodeTabs() {
  document.querySelectorAll('.code-tabs').forEach(function(tabGroup) {
    var tabs = tabGroup.querySelectorAll('.code-tab');
    var parentSection = tabGroup.closest('.demo-code') || tabGroup.parentElement;
    var panels = parentSection.querySelectorAll('.code-panel');

    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        var target = tab.getAttribute('data-tab');

        tabs.forEach(function(t) { t.classList.remove('active'); });
        panels.forEach(function(p) { p.classList.remove('active'); });

        tab.classList.add('active');
        var targetPanel = parentSection.querySelector('.code-panel[data-panel="' + target + '"]');
        if (targetPanel) targetPanel.classList.add('active');
      });
    });
  });
}

/**
 * Set a run button to loading state.
 * @param {HTMLElement} btn - The button element
 * @param {boolean} loading - Whether to show loading state
 */
function setLoading(btn, loading) {
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

/**
 * Escape HTML entities for safe insertion into the DOM.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// Initialize code tabs on DOM ready
document.addEventListener('DOMContentLoaded', initCodeTabs);
