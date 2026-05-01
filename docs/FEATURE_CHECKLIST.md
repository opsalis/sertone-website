# Sertone Feature → Docs → Demo Checklist

> Last updated: 2026-05-01
> Source: wrapper source code audit (panel.js, panel/server.ts, index.ts, panel/db.ts, panel/public/index.html)
> Purpose: decide what to document publicly / hide / build demo / add E2E test

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully documented |
| ⚠️ | Partially documented — gaps exist |
| ❌ | In code, NOT documented |
| 🚧 | In plan only — NOT yet in code |
| 🎬 | Has live demo |
| 🧪 | Has E2E test |
| 🙈 | Intentionally hidden (internal detail) |

---

## ★ ULTRANET — Strategic Crown Jewel

> **"UltraNet — It's what the internet should have been."**
>
> This is not another service type. UltraNet equals ALL other features combined in strategic importance.
>
> UltraNet is a private internet running inside the internet. Any TCP/IP service — web, email, database,
> game server, anything — can be hosted behind a control center, registered under a .gtw mesh domain,
> and reached anonymously by any other control center worldwide. Zero IP exposure at every hop.
> Consumer's IP never reaches any server, ever. Not the provider, not CDNs, not image hosts — nobody.
>
> **Status: Planned — not yet implemented. Dedicated build session required.**

| Component | Code | Docs | Demo | Notes |
|-----------|------|------|------|-------|
| .gtw domain registration (FQDNRegistry.sol) | 🚧 | — | — | Contract not yet deployed |
| FQDN resolution (RAM cache + L2 query) | 🚧 | — | — | fqdn-resolver.ts — not yet created |
| Mesh TCP exit proxy (provider side) | 🚧 | — | — | mesh-exit-proxy.ts — not yet created |
| UltraNet tab in panel (subscription mgmt) | 🚧 | — | — | Lists subscriptions, add/cancel — NOT a browser |
| Browser applet (port 3333, encrypted) | 🚧 | — | — | Phase 4 — after core backend |
| DNS interceptor (.gtw → virtual IP) | 🚧 | — | — | dns-interceptor.ts — PRIMARY access path |
| Captive portal (subscribe if not subscribed) | 🚧 | — | — | Served by wrapper when no valid subscription |
| Exit node (route external internet traffic) | 🚧 | — | — | External anonymity — mesh participant as exit |
| Subscription tiers (FQDNRegistry blob) | 🚧 | — | — | free/1h/1d/1w/1mo/1yr — provider defines subset |

---

### Architecture — Locked 2026-05-02

#### Access model — VPN is the ONLY universal solution

The UltraNet tab in the panel is for **subscription management only** — not browsing.
Even for HTTP websites, the consumer must use VPN to access the actual service.

**Why VPN is required:** The panel tab can only do HTTP fetch+render. Any non-HTTP service —
a game server, a database, an email server, a custom binary protocol — has no other path.
VPN mode works for every TCP protocol, every application, without exception.

**Three deployment scenarios — all identical from the consumer's perspective:**

| Wrapper location | VPN type | Notes |
|---|---|---|
| Remote VPS | Remote WireGuard | Standard VPN client setup |
| Home server / Raspberry Pi | LAN WireGuard | Local network, low latency |
| Same PC/Mac as user | Local loopback WireGuard | Same pattern as Cloudflare 1.1.1.1 app — traffic loops through local wrapper |

When wrapper runs on the same PC/Mac, WireGuard creates a local interface (10.13.13.0/24).
The user's apps connect to it. The wrapper intercepts, routes through the mesh, and returns responses.
The application cannot distinguish local from remote wrapper.

#### VPN traffic flow

```
Consumer app (browser, game, database tool, anything)
  ↓  normal TCP/DNS
WireGuard interface (10.13.13.0/24)
  ↓
dns-interceptor.ts at 10.13.13.1:53
  .gtw query → FQDNRegistry L2 resolve → assign virtual IP 10.13.14.x
  external query → forwarded to 1.1.1.1
  ↓
Wrapper intercepts TCP to 10.13.14.x
  Check SQLite: valid subscription for this FQDN?
  ↓                          ↓
 YES                          NO
  ↓                          ↓
Open mesh circuit        Serve captive portal HTML
Pipe bytes                 (subscription screen)
Provider receives          Consumer picks tier, pays
TCP stream                 On success: access granted
App gets response          On failure: error shown,
                           screen stays until new FQDN typed
```

#### Payment model — subscription only, no per-use

Per-use is not viable for UltraNet. Nobody pays per page load or per song chunk.
Subscription is the only model that delivers a usable internet experience.

**FQDNRegistry encrypted blob** (AES-256-GCM, CATALOG_BROADCAST_KEY):

```json
{
  "label":    "myservice",
  "tld":      "gtw",
  "relayId":  "abc123...",
  "expiresAt": 1234567890,
  "tiers": [
    { "id": "free", "duration_hours": 2,    "price_usdc": "0.00" },
    { "id": "1h",   "duration_hours": 1,    "price_usdc": "0.10" },
    { "id": "1d",   "duration_hours": 24,   "price_usdc": "0.50" },
    { "id": "1w",   "duration_hours": 168,  "price_usdc": "2.00" },
    { "id": "1mo",  "duration_hours": 720,  "price_usdc": "5.00" },
    { "id": "1yr",  "duration_hours": 8760, "price_usdc": "40.00" }
  ]
}
```

Provider publishes only the tiers they choose. `free` tier is optional.
`free` tier duration is provider-defined (30 min, 2 hours, 1 day — anything).
Price data travels inside the FQDN blob — no separate catalog entry, no pre-loading.

#### Price discovery — on demand, never pre-loaded

- No UltraNet entries in the browseable catalog (no Yahoo-style index)
- Price is fetched on first FQDN resolution only (L2 query → decrypt blob → relayId + tiers)
- RAM cache holds recently accessed FQDNs with grace-period eviction (5 min after last use)
- Only what the consumer has actually touched lives in RAM — never the full set

#### Subscription tracking — consumer side only

```sql
CREATE TABLE mesh_subscriptions (
  id             INTEGER PRIMARY KEY,
  fqdn           TEXT NOT NULL,
  tier_id        TEXT NOT NULL,       -- 'free' | '1h' | '1d' | '1w' | '1mo' | '1yr'
  subscribed_at  INTEGER NOT NULL,
  subscribed_until INTEGER NOT NULL,  -- unix timestamp
  price_paid     TEXT NOT NULL        -- '0.00' for free tier
);
```

**Provider never knows the consumer identity.** The provider sees only the last
intermediate hop's relayId — which belongs to a mesh relay node, not the consumer.
Multiple consumers routing through the same exit hop look identical.
Consumer-side SQLite is the sole enforcement authority for subscriptions and free tier.

**Free tier anti-abuse:** Consumer wrapper records `(fqdn, tier_id='free')` after first claim
and never shows the free tier again for that FQDN. No provider-side tracking —
doing so would require identifying the consumer, which breaks anonymity. Providers
set the free tier duration knowing some abuse is possible, as with any free trial.

#### Settlement

Paid tiers: settlement runs **once at subscription purchase** using the existing
settlement smart contract. 95% to provider, 5% platform. Identical to all other
Sertone API billing. No new contracts, no new infrastructure.

Free tier: zero settlement. No USDC moves. Platform takes nothing.

#### UltraNet tab — what it IS and IS NOT

| IS | IS NOT |
|---|---|
| List active subscriptions with expiry | A browser |
| Add new subscription (type FQDN → tier picker → pay) | An HTTP fetch tool |
| Cancel / renew subscription | A way to access any service |
| View subscription history | |

The captive portal (served by wrapper when consumer hits an unsubscribed .gtw address
through VPN) is an alternative entry point for first-time subscription.
Both paths lead to the same SQLite record and the same mesh access.

**Official name:** UltraNet
**Official tagline:** *"UltraNet — It's what the internet should have been."*
**Public framing when ready:** "A private internet inside the internet." — never mention Tor, onion, hops, or mesh internals.

### 🚦 UltraNet Ship Gate — ALL must be ✅ before any public page, tweet, or mention

- [ ] `FQDNRegistry.sol` deployed on ops chain — blob includes tiers array, address hardcoded in wrapper
- [ ] `fqdn-resolver.ts` built, unit tested (resolve / cache / eviction / re-query on failure)
- [ ] `mesh-exit-proxy.ts` built, unit tested (TCP stream → backend piping, subscription check)
- [ ] `dns-interceptor.ts` built (`.gtw` → virtual IP 10.13.14.x, external DNS → 1.1.1.1)
- [ ] Captive portal built and served by wrapper (tier picker HTML, payment, success/error flow)
- [ ] UltraNet tab in panel: subscription list + add/cancel (no browsing UI)
- [ ] `mesh_subscriptions` SQLite table implemented with free tier one-time tracking
- [ ] End-to-end test PASSES: CX43 registers `test.gtw` with tiers, Finland connects via VPN, captive portal appears, free tier claimed, TCP stream flows, zero IPs in logs
- [ ] CI build ships updated wrapper image (Watchtower auto-deploys to both dev nodes)
- [ ] Manual test: wrapper on same machine as browser — local WireGuard, `.gtw` resolves, service loads

**Until every box above is checked: no landing page, no teaser, no blog post, no tweet, nothing.**

This file is read at the start of every session. The gate is the source of truth.

---

## Service Types (what owners can offer)

| Feature | Code | Docs | Demo | E2E | Notes |
|---------|------|------|------|-----|-------|
| REST APIs | ✅ | ✅ | 🎬 | 🧪 | Core feature |
| GraphQL | ✅ | ✅ | 🎬 | 🧪 | |
| gRPC | ✅ | ✅ | — | 🧪 | No demo page yet |
| SOAP / XML-RPC | ✅ | ✅ | 🎬 | 🧪 | |
| JSON-RPC | ✅ | ✅ | — | — | No demo page |
| Live Streams (SSE + WebSocket) | ✅ | ✅ | 🎬 | 🧪 | |
| Smart Contracts | ✅ | ✅ | 🎬 | 🧪 | |
| Webhooks | ✅ | ⚠️ | 🎬 | — | webhook-delivery demo exists; docs page thin |
| A2A (Agent-to-Agent) | ✅ | ✅ | 🎬 | — | |
| MCP (Model Context Protocol) | ✅ | ⚠️ | — | — | ❌ No dedicated docs page; ❌ No demo |

---

## Consuming Services

| Feature | Code | Docs | Demo | E2E | Notes |
|---------|------|------|------|-----|-------|
| Browsing the Catalog | ✅ | ✅ | — | — | |
| Demo Mode (free trial calls) | ✅ | ✅ | — | 🧪 | |
| Calling a Service | ✅ | ✅ | — | 🧪 | |
| SDKs & Code Generators (18 total) | ✅ | ✅ | — | — | 13 langs + 5 AI integrations |
| Swagger "Try it" sandbox | ✅ | — | — | — | Built into catalog UI — not documented |
| Delivery Methods page | ✅ | ⚠️ | — | — | Old "5 delivery" concept predates mesh; page needs rewrite or removal |

---

## Billing & Payments

| Feature | Code | Docs | Demo | E2E | Notes |
|---------|------|------|------|-----|-------|
| Per-request pricing | ✅ | ✅ | 🎬 | 🧪 | |
| Per-stream / per-minute pricing | ✅ | ✅ | — | — | |
| Subscription plans (monthly unlimited) | ✅ | ⚠️ | 🎬 | — | subscription demo exists; docs thin |
| How pricing works (95/5 split) | ✅ | ✅ | — | — | |
| Per-endpoint pricing overrides | ✅ | ❌ | — | — | Not documented |
| Coinbase Onramp (buy USDC with Visa/Mastercard) | ✅ | ❌ | — | — | openCoinbaseOnramp() in panel.js — huge consumer UX win, not documented |
| USDC wallet (built into control center) | ✅ | ⚠️ | — | — | docs/wallet.html is a stub — needs content |
| USDT support | ✅ | ⚠️ | — | — | Supported for settlement; onramp is USDC only |

---

## Corporate & Enterprise

| Feature | Code | Docs | Demo | E2E | Notes |
|---------|------|------|------|-----|-------|
| OAuth / SSO delegation | ✅ | ⚠️ | 🎬 | — | oauth-corporate demo exists; docs thin |
| Multi-user accounts with roles | ✅ | ❌ | — | — | Admin / Owner / Consumer / Finance roles |
| IP allowlist per subscription | ✅ | ❌ | — | — | |
| Audit log | ✅ | ❌ | — | — | |

---

## Security

| Feature | Code | Docs | Demo | E2E | Notes |
|---------|------|------|------|-----|-------|
| End-to-end encryption | ✅ | ✅ | 🎬 | — | security demo exists |
| 2FA / TOTP | ✅ | ❌ | — | — | Implemented, not documented |
| API key authentication | ✅ | ✅ | — | — | |
| Emergency pause (per-service) | ✅ | ❌ | — | — | Owners can instantly halt a service |
| Anomaly detection + auto-pause | ✅ | ❌ | — | — | Unusual traffic patterns trigger alert |

---

## Alerts & Monitoring

| Feature | Code | Docs | Demo | E2E | Notes |
|---------|------|------|------|-----|-------|
| In-app alerts | ✅ | ✅ | — | — | |
| Email alerts | ✅ | ✅ | — | — | |
| Telegram alerts | ✅ | ❌ | — | — | Not documented |
| WhatsApp alerts | ✅ | ❌ | — | — | Not documented |
| Prometheus / Alertmanager webhook | ✅ | ❌ | — | — | Enterprise feature, not documented |

---

## Reliability & High Availability

| Feature | Code | Docs | Demo | E2E | Notes |
|---------|------|------|------|-----|-------|
| Multi-region failover | ✅ | ✅ | 🎬 | — | failover + cross-geography demos |
| High Availability setup | ✅ | ✅ | 🎬 | — | |
| VPN Server (WireGuard) | ✅ | ✅ | 🎬 | — | |
| API Auto-Scaler | ✅ | ❌ | — | — | Auto-spins replicas under load |

---

## Advanced / Developer Features

| Feature | Code | Docs | Demo | E2E | Notes |
|---------|------|------|------|-----|-------|
| API Version Management | ✅ | ❌ | — | — | Multiple versions of same service |
| BYO-Queue (9 protocols) | ✅ | ❌ | — | — | Kafka, RabbitMQ, SQS, NATS, Redis, Pulsar, etc. |
| BYO-Cloud (28+ providers) | ✅ | ❌ | — | — | S3, GCS, Azure Blob, Backblaze, etc. |
| Plugin System | ✅ | ✅ | — | — | |
| Provision Mode | ✅ | ❌ | — | — | Pre-provision wallets/config for fleet deploy |
| Recovery Mode | ✅ | ❌ | — | — | Disaster recovery flow |

---

## Backup & Data Portability

| Feature | Code | Docs | Demo | E2E | Notes |
|---------|------|------|------|-----|-------|
| Manual backup (download) | ✅ | ✅ | — | — | |
| Auto-scheduled backup | ✅ | ✅ | — | — | |
| Blockchain backup (on-chain encrypted) | ✅ | 🙈 | — | — | Never expose L2 detail — call it "encrypted cloud backup" |
| Wallet export / import | ✅ | ⚠️ | — | — | docs/wallet.html is a stub |

---

## Mesh Network Internals (🙈 Never expose)

| Feature | Code | Notes |
|---------|------|-------|
| Onion routing (multi-hop) | ✅ | Never document — say "encrypted mesh" only |
| Peer discovery / gossip | ✅ | Internal |
| Circuit routing (bidirectional) | ✅ | Internal |
| OSPF routing table | ✅ | Internal |

---

## Known Issues in Existing Docs / Website

| File | Issue | Priority |
|------|-------|---------|
| `docs/agents.html` | Overclaims agent deploy capability removed in v5 | 🔴 High |
| `docs/wallet.html` | Stub with no content | 🔴 High |
| `docs/faq.html` | Old nav sidebar structure, inconsistent with current docs/index.html | 🟠 Medium |
| `docs/delivery-methods.html` | "5 delivery methods" concept predates mesh — rewrite or remove | 🟠 Medium |
| `docs/index.html` | Some sidebar nav links are dead or point to old filenames | 🟡 Low |

---

## Demo Pages Status

| Demo | Exists | CSS Fixed | Up to Date |
|------|--------|-----------|------------|
| REST API | ✅ | ✅ | ✅ |
| GraphQL | ✅ | ✅ | ✅ |
| Multi-Protocol | ✅ | ✅ | ✅ |
| Smart Contract | ✅ | ✅ | ✅ |
| Cross-Geography | ✅ | ✅ | ✅ |
| Failover | ✅ | ✅ | ✅ |
| OAuth/Corporate | ✅ | ✅ | ✅ |
| VPN | ✅ | ✅ | ✅ |
| High Availability | ✅ | ✅ | Verify in browser |
| Subscription | ✅ | ✅ | Verify in browser |
| A2A | ✅ | ✅ | Verify in browser |
| Security | ✅ | ✅ | Verify in browser |
| Pay-per-use | ✅ | ✅ | Verify in browser |
| SSE Streaming | ✅ | ✅ | Verify in browser |
| SOAP | ✅ | ✅ | Verify in browser |
| XML-RPC | ✅ | ✅ | Verify in browser |
| Webhook Delivery | ✅ | ✅ | Verify in browser |
| S3 Delivery | ✅ | ✅ | Verify in browser |
| MCP | ❌ | — | Build needed |
| gRPC | ❌ | — | Could build |
| JSON-RPC | ❌ | — | Could build |

---

## The Genesis Block Principle

> Like Satoshi who mined the first block himself, we will run a handful of wrapper nodes in k3s
> for a few weeks after launch to seed the network with peers and catalog content.
> Then those nodes go dark — permanently.
>
> After that, Sertone has no servers, no infrastructure, no presence on the network.
> Nothing to subpoena. Nothing to shut down. Nothing to acquire.
> The network lives on whatever machines strangers choose to run.
>
> **This means the following must work perfectly before k3s goes dark:**
> - Bootstrap via GitHub manifest — the only way new wrappers find the network once seeds disappear
> - Peer gossip and self-healing mesh — the network must hold itself together without seeded nodes
> - L2 catalog (FQDNRegistry + CatalogRegistry) — the permanent record that outlives all k3s nodes
> - Settlement contracts — run forever, immutable, no operator needed
> - The wrapper itself — must be complete, correct, and permanent from day one

---

## Pre-Launch Sequence

> **Founding principle:** We build things to last from day one. No interim patches, no "fix it later."
> Every item below ships before the first real user. There are no shortcuts.

### 🔴 Block 1 — Security foundation (correct architecture, not patches)

**Port 3333 — Encrypted browser applet** *(eliminates BUG-012, 013, 014, 015 entirely)*
- ECDH WebSocket handshake on port 3333
- Encrypted applet blob delivery (AES-256-GCM with session key)
- Port 3002 bound to loopback/VPN only — never reachable from internet
- No admin/admin window. No nginx. No CSRF. No interim hacks.
- Applet includes: panel UI + catalog UI + Swagger sandbox + UltraNet tab (when ready)

**Remaining security fixes (server-side — port 3333 does not solve these)**
- CRIT-1: backend_addr SSRF validation
- CRIT-2: SQL injection hardening
- HIGH-1: FQDN input validation
- HIGH-4: Circuit cap enforcement

### 🔴 Block 2 — Infrastructure

- Bootstrap → systemd service on CX43 (dies on reboot = network dies)
- old-DE Hetzner console reboot → run prod CI → all 5 k3s nodes on latest code
- Upgrade ChainRPC plan (25K/day free tier already hitting cap on dev — prod will blow through it in hours)
- BUG-006: Standardize WRAPPER_VERSION format vs. manifest (customer wrappers hit infinite maintenance mode otherwise)

### 🔴 Block 3 — Catalog must have content on day one

- Register and verify ApiFactory services on prod nodes
- Consumer who installs and opens the catalog must find real services immediately
- Empty catalog = no value = churn on day one

### 🟠 Block 4 — Docs must be accurate

- `docs/agents.html` — remove false capability claims from v5 removal
- `docs/wallet.html` — write real content or remove from nav
- Coinbase Onramp — document prominently on buy page and docs (biggest consumer UX differentiator)
- MCP server — docs page + demo
- `docs/faq.html` — align nav sidebar with current structure

### 🟡 Block 5 — Nice to have before launch (do if time allows)

- BUG-003: Show "Updated to vX.Y.Z" notification after Watchtower restart
- Document 2FA/TOTP
- Document Telegram/WhatsApp alerts
- Rewrite or remove `docs/delivery-methods.html`

---

## Post-Launch (not required for launch, ship when ready)

- UltraNet (see ship gate above)
- BYO-Queue / BYO-Cloud docs
- Multi-user roles docs
- Emergency Pause docs
- API Auto-Scaler docs
- gRPC demo, JSON-RPC demo

---

## ⚪ Founder decisions still open

- BYO-Queue / BYO-Cloud — document publicly or keep hidden?
- "Encrypted cloud backup" — mention without L2 detail?
- Anomaly detection — surface as a feature?
