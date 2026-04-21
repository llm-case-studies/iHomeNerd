# RFC Comments: iHomeNerd Browser Extension

**Date:** 2026-04-21
**Reviewer:** Opus (AI Agent) — independent review
**Reference:** [RFC_BROWSER_EXTENSION_2026-04-21.md](./RFC_BROWSER_EXTENSION_2026-04-21.md)
**Prior art:** [RFC_BROWSER_EXTENSION_Comments_Gemini_2026-04-21.md](./RFC_BROWSER_EXTENSION_Comments_Gemini_2026-04-21.md)

This document provides a second-opinion review of the RFC, focusing on ideas and angles **not already covered** by the Gemini reviewer. Where overlap exists, I expand with additional technical context drawn from each project's existing integration specs and codebase.

---

## A. Cross-Cutting Observations (Sections 2–5)

These comments apply to the RFC design itself, independent of any particular app.

### A.1 Streaming Responses (Section 2.1 / 6.1)

**Context:** The RFC's bridge protocol shows a simple request→response cycle. However, multiple apps (iMedisys analysis, BTP-core AI Wingman, i2virtue simulation runs) produce long-running LLM responses that benefit from token streaming.

- [ ] **Streaming over `postMessage`:** Should the bridge support a streaming mode where the extension relays `ReadableStream` chunks (or a series of `postMessage` frames with a shared `requestId`) back to the page? Without this, apps must wait for the full LLM response before showing anything.
  - **Benefit:** Enables "typing indicator" UX across all apps. Critical for any app that calls Ollama/Gemma directly — response times of 3–15 seconds are common for local LLMs, and streaming makes the wait feel instant.

### A.2 Binary/Multipart Payloads (Section 2.1)

**Context:** The RFC's `body` field in `postMessage` is JSON. But several apps need to send binary data through the bridge: iScamHunter sends screenshots for evidence OCR, iMedisys sends bill photographs, On-My-Watch forwards camera snapshots, Kitchen sends dish photos.

- [ ] **Binary relay support:** Can the bridge accept `ArrayBuffer` or Base64-encoded payloads in the `postMessage` body and forward them as `multipart/form-data` to the brain?
  - **Benefit:** Without this, every app must Base64-encode images on its own and decode on the brain side, adding ~33% transfer overhead and complexity. A bridge-level solution standardizes this for all apps.

### A.3 `GET /discover` Response Schema (Section 2.2)

**Context:** The RFC says the discover endpoint returns "capabilities, hostname, and available models" but doesn't define the schema. With 14+ apps in the ecosystem, each needing different capabilities, this schema becomes the contract.

- [ ] **Standardize the `/discover` response:** Propose a formal schema that includes at minimum: `hostname`, `version`, `capabilities[]` (e.g., `["llm", "tts", "asr", "vision", "rules", "docstore"]`), `models[]` (loaded Ollama models), `plugins[]` (registered iHomeNerd plugins like `imedisys`, `scamhunter`), and `endpoints[]` (available API routes).
  - **Benefit:** Apps can make fine-grained routing decisions. e.g., iMedisys checks for the `imedisys` plugin; PronunCo checks for `asr` capability; i2virtue picks the brain with the beefiest GPU.

### A.4 Request Authentication / Per-App Scoping

**Context:** The RFC's security model validates *origins* but doesn't scope *what an origin can access*. Today that's fine — all apps share the same brain. But as the ecosystem grows, you may want iMedisys to access only `/v1/medical/*` and iScamHunter to access only `/v1/scamhunter/*`.

- [ ] **Per-origin route scoping:** Consider allowing brains to advertise per-origin permissions via `/discover`, e.g., `{ "origin": "https://imedisys.com", "allowed_paths": ["/v1/medical/*"] }`.
  - **Benefit:** Defense-in-depth. A compromised third-party origin on the allowlist can't probe other plugins' endpoints. Especially important when plugins handle sensitive domains (medical, legal, financial).

---

## B. App-Specific Feature Requests

### B.1 On-My-Watch + iForeclosed (Paired)

**Context:** On-My-Watch is a security camera AI platform with a "Eyes (Frigate+Coral) vs Brain (Local LLM)" architecture. It integrates tightly with iForeclosed via a "Virtuous Cycle" — On-My-Watch provides property condition reports that drive fair-market auction bids, which maximize surplus recovery for displaced homeowners. The two apps share the same physical hardware (cameras + brain).

- [ ] **Push events with image attachments (Section 2.5):** On-My-Watch's Frigate integration generates detection events with JPEG snapshots. Can the WebSocket push channel carry binary image payloads (or pre-signed local URLs) so the extension can render thumbnail-rich notifications like "Person detected at Front Door [📷]"?
  - **Benefit:** Security notifications without images are actionable only half the time. A thumbnail turns a notification into a decision: ignore (it's the mail carrier) or act (unknown person at 2 AM). This is On-My-Watch's core value prop.
- [ ] **Cross-app deep linking:** When On-My-Watch generates a property condition report, can the extension provide a context menu item "Send condition report to iForeclosed" that opens iForeclosed with the report pre-loaded?
  - **Benefit:** Directly supports the Partner Integration Workflow (doc `05_PARTNER_INTEGRATION_WORKFLOW.md`). Investors doing pre-auction due diligence need a one-click path from "here's what the camera saw" to "here's the surplus recovery estimate."
- [ ] **PTZ camera coordination (Section 2.4):** On-My-Watch's "Active Vision" feature (doc `FEATURE_SMART_MONITORING.md`) allows the AI to command PTZ cameras to zoom/pan. Can the cross-tab resource coordination handle camera PTZ control as a lockable resource, preventing two browser tabs from fighting over the same camera's orientation?
  - **Benefit:** Multi-user households or multi-tab workflows could otherwise send conflicting PTZ commands, creating a disorienting feedback loop.

---

### B.2 iScamHunter + Crypto-Fakes (The Defense Funnel)

**Context:** These two apps form a **defense funnel**: Crypto-Fakes raises awareness with case studies, iScamHunter provides investigation tools, and iHomeNerd powers the AI behind both. iScamHunter already has a `Browser_Addins/` directory with a "Universal Page Capture" extension scaffold (v0.3), and a detailed `IHOMENERD_INTEGRATION.md` spec defining 7 investigation endpoints.

- [ ] **Absorb existing extension scaffold:** iScamHunter already has a Manifest V3 page-capture extension (`Browser_Addins/General/`). Its "one-click HTML + screenshot + outline" capture should become a feature of the iHomeNerd Bridge extension rather than a separate extension. Can the bridge expose a `captureCurrentPage` message type that content scripts can use to grab the DOM and forward it to `/v1/scamhunter/evidence`?
  - **Benefit:** Eliminates a redundant extension install. The existing scaffold (doc `extension_scaffold_2025-05-28.md`) already solves the capture problem — it just needs to route through the bridge instead of downloading files locally.
- [ ] **Context menu: "Investigate this" (Section 2.6):** The iScamHunter integration spec defines `POST /v1/scamhunter/investigate` which accepts URLs, wallet addresses, domain names, or social profiles. Can the context menu auto-detect what's selected (URL vs. crypto address vs. text) and route to the appropriate iScamHunter endpoint?
  - **Benefit:** The investigation flow in `IHOMENERD_INTEGRATION.md` (Section 2.2) starts with evidence collection. Right-click→Investigate eliminates the copy-paste step from browser to app, which is where most users abandon the process.
- [ ] **Passive URL reputation (Section 2.6, v1.0):** The RFC mentions "passive URL monitoring" in v1.0. iScamHunter already has a cross-case pattern detection system (`POST /v1/scamhunter/case/{id}/query` with `search_scope: "all_cases"`). Can the extension check each visited URL against the local iScamHunter case database (wallet clustering, domain fingerprinting) and show a small shield icon in the address bar?
  - **Benefit:** Turns the existing case database into a real-time protective shield. This is the "Family Shield" product tier described in `IHOMENERD_INTEGRATION.md`. The $5K family loss that motivated this project (Section 8) could have been prevented by exactly this feature.

---

### B.3 iMedisys

**Context:** iMedisys is migrating from cloud Gemini to an iHomeNerd plugin (`IHOMENERD_MIGRATION_PLAN.md`). The frontend is a split-screen clinical text analyzer with CPC coding, bill explanation, and Medicare decision support. It sends *scrubbed* clinical text to the brain — the privacy scrubber runs client-side before any data leaves the browser.

- [ ] **Privacy scrubber as a bridge feature:** iMedisys's `privacyScrubber.ts` strips PII (SSNs, names, DOBs) before sending text to the brain. Could the extension offer an optional "scrub before relay" middleware that other apps could also use? e.g., iLegalFlow handling client names, iForeclosed handling homeowner data.
  - **Benefit:** The privacy scrubber is well-tested, domain-specific code. Sharing it at the extension level means any app handling sensitive text gets automatic PII stripping as a bridge option, rather than each app reimplementing it.
- [ ] **Bill/EOB photo capture shortcut:** The iMedisys migration plan adds `POST /v1/medical/bill-explain` with multipart image support. Can the extension provide a toolbar shortcut that opens the device camera, captures a photo of a paper bill, and routes it directly to this endpoint?
  - **Benefit:** The target user (a patient or their family advocate) is often not tech-savvy. A one-click "photograph your bill" flow in the extension popup is dramatically more accessible than navigating to the iMedisys web UI first.
- [ ] **Deadline handoff to WhoWhe2Wha (cross-app event):** The iMedisys Medicare comparison endpoint generates deadlines (e.g., "MA Trial Right expires 2026-08-15"). These currently need manual export to WhoWhe2Wha. Can the extension mediate this — when iMedisys emits a deadline, the extension automatically offers "Add to WhoWhe2Wha timeline"?
  - **Benefit:** Closes the loop in the existing `IHOMENERD_DEADLINE_INTEGRATION.md` spec between iMedisys and WhoWhe2Wha. The extension replaces the awkward localStorage bridge (Phase 2 in that spec) with a clean cross-app message.

---

### B.4 WhoWhe2Wha

**Context:** A life timeline app (Who/When/Where/What) with events, projects, recurring events, ICS import/export, sharing via URL-encoded compressed data, and Gemini-powered natural language search. It has a detailed iHomeNerd Deadline Integration spec defining 3 phases of progressive integration.

- [ ] **Extension as the deadline broker (Phase 2→3 bridge):** The `IHOMENERD_DEADLINE_INTEGRATION.md` spec describes 3 phases: ICS import → localStorage bridge → API polling. The extension can *replace* all three with a single mechanism: brain pushes deadline events via WebSocket → extension routes to WhoWhe2Wha tab or shows notification with "Add to timeline" action button.
  - **Benefit:** Collapses 3 integration phases into 1. The extension is the natural home for this because it's already maintaining the WebSocket connection (Section 2.5) and has cross-tab routing.
- [ ] **ICS export via extension:** WhoWhe2Wha generates `.ics` files for calendar export. Can the extension intercept these and offer "Sync to iHomeNerd brain" as an alternative to downloading a file? This would let the brain be the single source of truth for all deadline data.
  - **Benefit:** Enables round-trip sync: brain deadlines appear on WhoWhe2Wha timeline, and user-created WhoWhe2Wha events are backed up to the brain. Currently data flows only one direction.
- [ ] **Context menu: "Add to WhoWhe2Wha" (Section 2.6):** When a user highlights a date or event description on any web page, the extension could offer "Add to WhoWhe2Wha timeline" — extracting the date, title, and source URL into a new event.
  - **Benefit:** Users frequently discover deadlines on government sites (Medicare.gov, IRS.gov), event pages, or emails. One-click capture to the life timeline eliminates the manual event creation workflow.

---

### B.5 Sober-Body + PronunCo (Shared Monorepo)

**Context:** These two apps share a pnpm monorepo with a shared `dev.sh` script. PronunCo already has a working browser extension (`PronunCo Local Bridge`) that the RFC is designed to absorb. Sober-Body is a PWA for drink logging and BAC tracking.

- [ ] **PronunCo migration canary:** Since PronunCo is the only app with an existing extension, its migration is the critical path. Can the iHomeNerd Bridge extension detect if the old `PronunCo Local Bridge` extension is also installed and show a one-time migration prompt ("You can now uninstall PronunCo Local Bridge — iHomeNerd Bridge handles everything")?
  - **Benefit:** Prevents user confusion from having two extensions that do similar things. Smooth migration UX is essential since PronunCo users are the earliest adopters and most sensitive to breakage.
- [ ] **Sober-Body: "Emergency mode" notification escalation:** Sober-Body tracks BAC estimates. If BAC crosses a configurable danger threshold, can the extension escalate from a standard notification to a persistent, high-priority `chrome.notifications` alarm that requires user acknowledgment?
  - **Benefit:** A dismissed notification at 0.15 BAC could be the difference between a user calling a ride or not. This is a harm-reduction app — the notification priority should reflect the urgency. Standard `chrome.notifications` support `requireInteraction: true` for exactly this scenario.

---

### B.6 BTP-core (TelPro-Bro)

**Context:** TelPro-Bro is a charisma coaching app with an "AI Wingman" that provides real-time communication guidance. It originally planned its own local companion service (FastAPI on `localhost:5151`) but has now superseded that with iHomeNerd integration (doc `LOCAL_COMPANION.md` notes "Superseded — replaced by `IHOMENERD_INTEGRATION.md`").

- [ ] **Companion service retirement:** The `LOCAL_COMPANION.md` spec describes a standalone FastAPI companion on port 5151. Since this is now superseded by iHomeNerd, the extension's CORS bridge eliminates the need for TelPro-Bro to ship its own companion entirely. Can the RFC explicitly list TelPro-Bro's companion retirement as a migration win (alongside PronunCo's extension retirement)?
  - **Benefit:** Documents the pattern: the iHomeNerd Bridge replaces *both* per-app extensions (PronunCo) and per-app local companions (TelPro-Bro). This strengthens the RFC's "one extension, all apps" pitch.
- [ ] **Tab audio capture coordination (Section 2.4):** TelPro-Bro needs to capture tab audio for charisma analysis during video calls. Can the cross-tab resource coordination (Section 2.4) manage `tabCapture` permissions? If PronunCo is recording microphone in one tab and TelPro-Bro needs tab audio in another, the extension should be able to coordinate these non-conflicting captures.
  - **Benefit:** `tabCapture` is a different resource from `microphone`, but both involve audio hardware. The extension needs a resource taxonomy that distinguishes between them to avoid false conflicts.

---

### B.7 m-Beacon

**Context:** m-Beacon is a customer behavior simulation tool using a "Semantic Compiler" architecture — LLMs normalize messy analytics data (GA4, Mixpanel) into archetype parameters, then a numerical optimizer tunes them. It targets local LLM integration (Nemotron/Llama3) for the semantic intelligence layer.

- [ ] **Analytics data ingestion via extension:** m-Beacon's Hybrid Optimization Strategy describes a "Universal Adapter" that normalizes GA4 CSV exports and Mixpanel JSON dumps using an LLM. Can the extension's context menu offer "Send analytics data to m-Beacon" when the user is on a GA4 or Mixpanel dashboard, capturing the visible data table and forwarding it to the local brain for normalization?
  - **Benefit:** Eliminates the manual "export CSV → upload to m-Beacon" workflow. The extension can detect analytics platform pages by URL pattern and offer contextual capture.

---

### B.8 edge-kite (Expanded)

**Context:** edge-kite is a Rust-based edge analytics platform with an outbox-pattern sync architecture. Its browser tracker (`sdk/js/tracker.js`, ~5KB) sends events to a local agent on port 8080.

- [ ] **Tracker.js routing through bridge:** If edge-kite's `tracker.js` could detect the iHomeNerd Bridge extension and route events through it instead of direct `fetch()`, it gains automatic edge-agent discovery (no hardcoded port) and CORS immunity.
  - **Benefit:** The tracker becomes a true "install and forget" script. Currently it needs `data-endpoint="/api/events"` pointing to a known URL. With the bridge, it can use `postMessage` to ask "where's my nearest edge-kite agent?" and the extension handles routing.
- [ ] **EdgeKite as a telemetry backend for all apps:** Can the extension itself emit telemetry events (extension installed, brain discovered, bridge request count) to a local edge-kite agent? This provides Alex with local-only analytics on how the ecosystem is being used — without any cloud dependency.
  - **Benefit:** Self-hosting analytics for a self-hosted ecosystem. Meta-level: using edge-kite to monitor iHomeNerd usage is exactly the kind of dogfooding that validates both products.

---

### B.9 i2virtue (Expanded)

**Context:** i2virtue runs multi-agent social simulations mixing frontier cloud models with local Ollama/llama.cpp agents. Simulations involve rapid, parallel LLM calls across multiple providers.

- [ ] **Multi-brain load balancing (Section 2.2):** i2virtue simulations can saturate a single brain's GPU. If the extension maintains a registry of multiple brains (Section 2.2), can it expose a `loadBalance: true` option in the bridge request that round-robins across available brains with matching capability?
  - **Benefit:** A household with "Brain 1: MSI Raider (RTX 4070)" and "Brain 3: Old laptop" could spread i2virtue's agent calls across both, doubling throughput. The extension already knows each brain's capabilities from `/discover`.
- [ ] **Simulation dashboard origin management:** i2virtue frequently spins up temporary dashboards on random local ports during development. Can the origin allowlist support a pattern like `http://localhost:*` (already in the RFC default list) with an optional "developer mode" toggle that logs which origins are using the bridge?
  - **Benefit:** Audit trail for development — see which ports/origins are making bridge requests. Useful for debugging simulation setups without compromising security in production.

---

## C. Architectural Suggestions

### C.1 Extension as the Ecosystem "Bus"

Several of the feature requests above share a pattern: **cross-app messaging**. iMedisys wants to push deadlines to WhoWhe2Wha. On-My-Watch wants to push reports to iForeclosed. iScamHunter wants to publish cases to Crypto-Fakes.

- [ ] **Cross-app message bus (v0.3+):** Consider formalizing this as a first-class extension feature: any app can publish a typed event (`{ type: 'deadline-created', payload: {...} }`) and any other app can subscribe to that event type. The extension routes between tabs.
  - **Benefit:** Replaces ad-hoc localStorage bridges, ICS file exports, and manual copy-paste with a unified pub/sub system. The extension is the natural home for this because it already has the cross-tab routing infrastructure from Section 2.4/2.5.

### C.2 Extension Health Telemetry Dashboard

- [ ] **Self-diagnostics in popup (Section 2.3):** Beyond green/orange/red badge, the popup could show: requests relayed (last 24h), average latency per brain, failed requests, which apps are actively using the bridge, and queue depth (if offline queue is active).
  - **Benefit:** Debugging "it's not working" is the #1 support burden for local-network software. A rich diagnostics view in the popup lets Alex (and future users) self-diagnose without touching developer tools.
