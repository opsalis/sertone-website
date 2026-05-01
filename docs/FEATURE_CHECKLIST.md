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

> **This is not another service type. UltraNet equals ALL other features combined in strategic importance.**
>
> UltraNet is an anonymous TCP/IP internet inside the mesh — any TCP/IP service (web, email, DB, game server,
> anything) can be hosted behind a control center, registered under a .gtw mesh domain, and reached
> anonymously by any consumer running a control center. Zero IP exposure. Like Tor but for every protocol.
>
> **Status: Planned — not yet implemented. Dedicated build session required.**

| Component | Code | Docs | Demo | Notes |
|-----------|------|------|------|-------|
| .gtw domain registration (FQDNRegistry.sol) | 🚧 | — | — | Contract not yet deployed |
| FQDN resolution (RAM cache + L2 query) | 🚧 | — | — | fqdn-resolver.ts — not yet created |
| Mesh TCP exit proxy (provider side) | 🚧 | — | — | mesh-exit-proxy.ts — not yet created |
| UltraNet browser tab in panel | 🚧 | — | — | URL bar: type service.gtw → fetch → render |
| Browser applet (port 3333, encrypted) | 🚧 | — | — | Phase 4 — after core backend |
| DNS interceptor (.gtw → virtual IP) | 🚧 | — | — | dns-interceptor.ts — for VPN mode |
| Exit node (route external internet traffic) | 🚧 | — | — | External anonymity — mesh participant as exit |
| Domain pricing + billing model | 🚧 | — | — | Per-connection or subscription |

**Public framing when ready:** "Anonymous internet access" / "host anything privately" — never mention Tor, onion, hops, or mesh internals.

**Decision needed:** What is the public name for this? "UltraNet"? "Private Web"? Something else?

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

## Priority Actions

### 🔴 Fix immediately
1. `docs/agents.html` — remove/fix false capability claims
2. `docs/wallet.html` — add real content or remove from nav

### 🟠 High priority (next session)
3. Add MCP docs page + demo
4. Document Coinbase Onramp (massive consumer UX differentiator — card → USDC with zero friction)
5. Fix `docs/faq.html` nav to match current sidebar structure
6. Rewrite or remove `docs/delivery-methods.html`

### 🟡 Medium priority (founder decides)
7. Document 2FA/TOTP
8. Document Telegram/WhatsApp alerts
9. Document multi-user roles (Admin/Owner/Consumer/Finance)
10. Document Emergency Pause
11. Document API Auto-Scaler

### ⚪ Decide (founder)
- BYO-Queue / BYO-Cloud — document publicly or keep hidden?
- Anomaly detection — mention as a feature?
- UltraNet — public name? Framing? Timeline?
- "Encrypted cloud backup" — mention without L2 detail?
