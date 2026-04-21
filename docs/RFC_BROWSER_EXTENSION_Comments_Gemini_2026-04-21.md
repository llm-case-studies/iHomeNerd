# RFC Comments: iHomeNerd Browser Extension

**Date:** 2026-04-21
**Reviewer:** Gemini (AI Agent)
**Reference:** [RFC_BROWSER_EXTENSION_2026-04-21.md](./RFC_BROWSER_EXTENSION_2026-04-21.md)

This document contains proposed additions to Section 6 of the RFC, gathered from reviewing other applications in the workspace. Each request is accompanied by project context and benefits to provide transparent justification.

---

### 6.8 On-My-Watch

**Context:** On-My-Watch is a local-first security camera AI leveraging Frigate and Local LLMs/Edge TPUs for privacy-first computer vision (an "Eyes vs Brain" architecture).

- [ ] **Push events (Section 2.5):** Can the extension handle high-frequency push events for security detections (e.g., "Person detected at Front Door") from local Frigate/Coral instances, and potentially render image thumbnails in the native notification?
  - **Benefit:** Provides real-time, actionable security alerts with visual context directly to the user's browser, eliminating the need to actively monitor a dashboard tab.
- [ ] **Discovery:** Can the brain discovery (Section 2.2) also advertise NVR streams or Edge TPU vision capabilities?
  - **Benefit:** Allows other apps (like Kitchen/Tax) to dynamically discover and utilize hardware acceleration (Coral TPUs) or camera feeds if needed for unified home monitoring or computer vision tasks.

### 6.9 Sober-Body

**Context:** A real-time alcohol harm-reduction companion app used for one-tap drink logging and BAC tracking. It is frequently used in environments with poor connectivity, such as bars or festivals.

- [ ] **Offline Queue (Section 2.7):** Can the extension queue drink logs with precise local timestamps when the user is entirely offline, and replay them reliably to the local brain later?
  - **Benefit:** Ensures users can safely log drinks in network dead zones without data loss or timeline distortion when sync is restored. This is critical for maintaining accurate BAC estimates.
- [ ] **Push events:** Can the extension trigger localized hydration reminders or BAC threshold alerts as native notifications even when the app tab is closed?
  - **Benefit:** Proactively alerts users about their pacing and hydration, fulfilling the core harm-reduction mission regardless of whether the app is actively open in the browser.

### 6.10 edge-kite

**Context:** A lightweight, offline-first edge analytics platform that collects events locally (e.g., via a browser tracker) before optionally syncing to a central hub.

- [ ] **CORS Bridge (Section 2.1):** Can the extension proxy telemetry/analytics payloads (from `tracker.js`) to a local EdgeKite agent?
  - **Benefit:** Bypasses ad-blockers that often block standard tracking domains and circumvents CORS restrictions, ensuring reliable, privacy-preserving first-party local analytics.
- [ ] **Discovery:** Can `GET /discover` be standardized or extended to find local EdgeKite hubs/agents alongside standard iHomeNerd brains?
  - **Benefit:** Enables zero-configuration setup for local network applications to start logging telemetry immediately.

### 6.11 i2virtue

**Context:** An agentic social simulation platform designed to test human systems using frontier and local LLMs (Ollama/llama.cpp) by running high-volume, concurrent scenarios.

- [ ] **CORS Bridge:** For running agentic simulations, can the bridge handle high-concurrency requests to local Ollama/llama.cpp instances without throttling or dropping connections?
  - **Benefit:** Simulations generate rapid, parallel LLM calls. A robust bridge ensures large-scale agent tests run smoothly without network-layer bottlenecks.
- [ ] **Origin Allowlist (Section 4.1):** Can the allowlist dynamically support temporary/ephemeral simulation dashboard origins or wildcard local development ports?
  - **Benefit:** Facilitates rapid development and temporary dashboard spin-ups without the friction of manually whitelisting every new local dev port.

### 6.12 BTP-core

**Context:** Features a local companion-service (Docker/vLLM) and implements a "See-Through Mode" or persistent PWA always-on-top guidance (an AI Wingman).

- [ ] **AI Wingman / UI Integration:** How does the extension coordinate with a persistent PWA overlay (e.g., the "See-Through Mode")? Can it route local companion-service requests efficiently to support always-on-top guidance?
  - **Benefit:** Enables seamless "AI wingman" experiences where the extension securely feeds browser context into the local LLM and interacts with an always-on-top companion UI without CORS friction.

### 6.13 iLegalFlow & iForeclosed

**Context:** AI Studio applications designed for analyzing legal documents, workflows, and identifying surplus recovery eligibility from public or financial records.

- [ ] **Context Menu (Section 2.6):** Can we add "Check for surplus recovery eligibility" or "Analyze legal clause" to the right-click context menu when highlighting text or PDF links?
  - **Benefit:** Dramatically speeds up the user workflow by allowing instant analysis of highlighted text or documents directly from the source page, avoiding manual copy-pasting.
- [ ] **Security:** Given the sensitive nature of legal and financial documents, are there guarantees that the `postMessage` channel is isolated from other potentially malicious tabs?
  - **Benefit:** Vital for maintaining the confidentiality and integrity of sensitive legal and financial data passing through the local bridge.
