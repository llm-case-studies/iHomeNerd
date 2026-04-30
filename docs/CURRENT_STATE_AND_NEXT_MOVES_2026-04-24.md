# iHomeNerd Current State And Next Moves

**Status:** working draft  
**Date:** 2026-04-24  
**Owner:** Alex

---

## 1. Why this doc exists

The project has moved from "single local AI box" toward:
- one gateway / control plane
- multiple optional nodes
- multiple install and trust paths

That is good progress, but it also means the current live environment can be misleading when different nodes are running different iHN revisions or different runtime styles.

This document records:
- what is working today
- what is partially working but still misleading
- the highest-priority next moves

See also:
- `docs/NODES_CONTROL_PLANE_SPEC_2026-04-23.md`
- `docs/HOST_ASSIST_VISION_2026-04-24.md`
- `docs/MOBILE_STRATEGY_2026-04-24.md`

---

## 2. What is working today

### 2.1 Core product shape

iHomeNerd is already functioning as:
- a local HTTPS command center
- a capability-routed local AI stack
- a LAN-discoverable node
- a first gateway / control-plane prototype

The current stack already covers more than "one LLM":
- chat
- translation
- docs / RAG
- speech-related capabilities
- image analysis hooks
- Local Radar / Investigate
- managed-node preflight and lifecycle work

### 2.2 Try-now path

The current honest first-run path is:
- Linux node with SSH already working
- Docker install
- browser access from another machine on the LAN

That path has been validated on real home hardware.

### 2.3 Control plane

The gateway can now:
- inventory cluster nodes
- suggest node roles from hardware and capabilities
- run SSH preflight on candidate nodes
- register candidates
- promote Linux nodes
- promote macOS nodes in code via a launchd-based path
- start / stop / restart managed runtimes
- check split update lanes in the UI model

### 2.4 Real node fit is becoming visible

The home cluster model is now grounded enough to talk about real roles:
- gateway / control plane
- GPU worker
- light specialist
- future Coral / edge specialist

### 2.5 Remote hardware-compat behavior

The misleading "every target shows MSI's RTX" behavior has been fixed.

### 2.6 Android travel-node discovery is now real

The Motorola Edge 2021 is now functioning as a real LAN-discoverable Android node:
- serves setup on `:17778` and trusted runtime on `:17777` over Wi-Fi without USB forwarding
- advertises `_ihomenerd._tcp` over mDNS / Avahi
- is found by the shared iHomeNerd Bridge LAN scan
- passes the extension's `Test Connection` flow

That is a meaningful milestone because it proves the Android node is no longer just a local-shell demo. It is visible to the browser-side integration path on the home network.

One nuance became clear immediately: Android DNS-SD service advertisement does not automatically give us a stable browser-resolvable friendly `.local` hostname. For Android travel nodes, the extension should treat the discovered IP as the canonical transport address and treat hostnames as labels unless resolution is proven.

The Android code path has also moved past the placeholder web page: the app now packages the real built Command Center assets from `backend/app/static` and the Android HTTPS runtime serves those bundled assets on `:17777`. The remaining work there is live-device verification and then replacing mock endpoint behavior with honest capability-gated Android responses.

That packaging change has now been smoke-tested on the Motorola itself: after reinstall, the Android foreground runtime comes up, both `17777` and `17778` are listening, and the device-local setup endpoint responds with valid trust/cert metadata. The remaining uncertainty is host-side network reachability from the development shell, not Android startup.

That verification gap is now closed from the user side: the Motorola is visibly serving the real Command Center in the browser at `https://192.168.0.246:17777`. The frontend has also been tightened so Android-hosted mode stops pretending missing model backends exist. `Chat`, `Talk`, and `Translate` now use the node capability map and show capability-gated copy instead of fake Gemma/Whisper/Kokoro labels when those backends are not installed.

That milestone has now advanced one step further: the Motorola has a real local Android TTS backend. Over live HTTPS, `/capabilities` reports `synthesize_speech: true` with `backend: android_tts_service`, `/v1/voices` returns the Android voice inventory, and `/v1/synthesize-speech` returns real `audio/wav` bytes.

That leaves the next Android milestone very concrete:
- keep the real hosted UI
- keep the honest capability gating
- keep Android TTS as the first working local speech backend
- add real ASR next
- then add a real local dialogue backend

The Motorola now also reports live node-load metrics to the browser and supports browser-side voice selection for Android TTS. That gives us a factual baseline for judging mobile speech cost before we add ASR:
- idle app CPU / memory / thermal status are visible in `System`
- last TTS duration, output size, voice, and language are recorded
- `Talk` can now audition a chosen Android voice instead of only auto-selecting one

That ASR step is now in motion too. The Motorola now exposes a real `POST /v1/transcribe-audio` endpoint backed by Android speech recognition, and the browser `Talk` panel switches to a JSON/base64 upload path for Android-hosted ASR instead of pretending the desktop multipart Whisper flow exists everywhere. The first loopback probe was intentionally simple: synthesize `Testing local speech recognition on iHomeNerd.` on the phone, post that WAV back into the ASR endpoint, and inspect the returned transcript. The result came back as `The school`, which is imperfect but important. It proves the upload path, recognizer handoff, and response plumbing are real. The remaining work has shifted from plumbing to quality measurement:
- browser mic capture quality from laptop and iPhone
- first-transcript latency
- transcript accuracy across a short PronunCo phrase set
- whether strict on-device recognition can be enabled on this device later, instead of the current offline-preferred recognizer fallback

Current behavior:
- local node scan -> local real hardware probe
- remote iHN node scan -> uses that remote node's own `/discover` telemetry
- plain LAN device -> explicitly says remote hardware inspection is not available yet

That is less magical, but much more honest.

---

## 3. What is partially working but still unstable

### 3.1 Deployment consistency across nodes

This is the biggest operational issue right now.

Different nodes may be running:
- different commits
- different runtime styles
- different update histories
- different local changes

In practice, that makes bug triage confusing:
- some issues are old code
- some are current code
- some are stale frontend assets
- some are runtime/environment differences

Until node rollout is more consistent, system behavior will feel less deterministic than it really is.

### 3.2 Node naming on Dockerized nodes

Dockerized nodes can lose useful LAN name resolution for non-iHN devices.

Observed behavior:
- host-process nodes can resolve `.local` names more reliably
- Dockerized nodes often fall back to `Device (IP)`

Root cause:
- the container cannot reliably use the host's mDNS / Avahi context
- so device enrichment inside the container is weaker than on the host

This is not a model problem. It is an environment / host-assist problem.

### 3.3 Remote hardware inspection

Current remote hardware scan behavior is intentionally conservative.

Supported:
- scan local node directly
- summarize another node already running iHN

Not yet supported:
- true remote hardware probe for a plain LAN device before iHN is installed

That means Macs, Windows machines, and mystery devices still need:
- Gateway Control preflight
- or later a proper host-assisted remote hardware probe

### 3.4 Gateway SSH assumptions

The control plane uses the gateway's SSH identity, not the operator laptop's.

That means:
- your laptop might be able to SSH to a target
- while the gateway cannot

Current UI now warns about this, but the product still needs an operator-friendly fix path.

### 3.5 Home CA / trust is not operationally solid yet

Architecturally, the target is correct:
- one Home CA per household
- per-node server certs signed by that Home CA

Code support exists for shared CA reuse and import.

But operationally, trust still feels fragile:
- users can still hit repeated browser "Advanced" flows
- CA reuse across nodes is not yet visible enough in the UI
- there is no clear "trust health" surface
- there is no household CA fingerprint / chain status page
- reinstall / rebuild flows can still make trust feel inconsistent even when the underlying CA model is correct

The HP observation is the right warning sign:
- the product intent is "trust once per household"
- the lived experience can still degrade back into "trust per node again"

That gap needs product-level attention, not just certificate-generation code.

---

## 4. The current CA / cert truth

### 4.1 Desired trust model

The intended trust model is:
- one Home CA for the home
- trusted once on each user device
- each node gets a server cert signed by that Home CA
- node IP / hostname changes should require server-cert refresh only, not CA re-trust

### 4.2 Current code direction

The code already supports:
- CA generation
- server cert generation with LAN IP and hostnames
- shared CA reuse / import
- Apple trust profile download
- trust test endpoint

### 4.3 What is missing

The missing piece is not basic crypto. It is control-plane visibility and recovery.

The gateway should be able to answer:
- Which Home CA is active for this household?
- What is its fingerprint?
- Which nodes are using it?
- Which nodes are serving certs signed by it?
- Which user devices have successfully validated it recently?
- Did a node fall back to another CA or regenerate unexpectedly?

### 4.4 Next trust deliverables

The next trust-focused features should be:
- Home CA fingerprint and active-household trust card in System
- per-node cert chain status
- "this node matches the household Home CA" indicator
- explicit stale / mismatched / unknown trust states
- browser/device trust verification results
- cleaner recovery flow when trust is missing

---

## 5. Highest-priority next moves

### 5.1 Stabilize rollouts

Before adding too much more behavior, reduce node drift.

Needed:
- versioned release path
- predictable update channel
- same code path across gateway and workers
- less ad-hoc file copying
- more "update this node to this revision" behavior

### 5.2 Build host-assist

Host-assist is now justified by real failures, not theory.

Top host-assist jobs:
- host LAN name cache for Dockerized nodes
- Home CA / trust health
- SSH Doctor and key bootstrap
- OS / runtime update checks
- hardware and device inventory that containers cannot see cleanly

### 5.3 Add SSH Doctor

The gateway should not just say "preflight failed."

It should diagnose:
- port closed
- timeout
- auth denied
- host key mismatch
- remote login disabled
- missing OpenSSH server
- missing gateway key trust

And it should offer concrete recovery steps per OS.

### 5.4 Make remote probes honest and useful

Remote probes should move from:
- fake certainty

to:
- real telemetry when available
- explicit limitations when not
- guided escalation into SSH preflight when needed

### 5.5 Make trust feel household-level

This is both a product and operations priority.

The user should feel:
- "I trusted my home"

not:
- "I keep clicking through cert warnings on random nodes"

### 5.6 Kick off mobile as a control surface, not a second brain

Native mobile should begin as:
- scout
- controller
- trust / pairing helper
- notifications / monitoring surface

not as:
- the place where heavy local inference runs

### 5.7 Validate the spare-hardware ladder

This should become an explicit product and ecosystem workstream, not just ad-hoc tinkering.

Goal:
- show that free OSS iHN can give old household hardware a real role
- map tested hardware to the apps it can realistically support
- keep cloud AI as an optional deeper-insight layer, not the entry requirement

Prerequisites:
- iHN install/update path is clean enough to repeat on multiple targets
- Android portable-node networking works over real LAN / hotspot without USB dependency
- deploy/update function is streamlined enough for repeatable tests on old laptops and desktops
- build/version visibility is clear enough that device results map to a real revision

Validation ladder:
1. Make the Motorola Edge 2021 serve both UI and API cleanly over LAN / hotspot.
2. Try older Android devices against the current iHN implementation and record what role each can actually fill.
3. Streamline deploy/update and test it on older machines such as `Acer-HL`.
4. Revive the aging gaming rig with the `24 GB` GPU tier and validate heavier local workloads on it.
5. Turn the results into a compatibility table with ecosystem-fit labels such as `iHN Core`, `On-My-Watch`, `EdgeKite`, `PronunCo`, `Tax`, and `iMedisys`.

Current Android proof point:
- `M-E-2021` now serves the real Command Center over `https://:17777`
- Android local TTS works from Dell and iPhone clients
- Android local Sherpa ONNX Moonshine ASR now works for `en-US` and `es-ES`
- `/system/stats` exposes real ASR/TTS performance metrics for browser-visible benchmarking

Why this matters:
- it creates an honest adoption story around spare hardware
- it gives vertical apps a factual hardware-fit story
- it supports free core plus paid convenience / premium-app layers without weakening the local-first position

---

## 6. Practical recommended order

1. Release consistency and version visibility across nodes.
2. Host-assist for LAN naming and trust health.
3. SSH Doctor and key-bootstrap flow.
4. Host-assisted remote hardware preflight for non-iHN devices.
5. Android portable-node networking that serves real UI and API over hotspot / LAN.
6. Spare-hardware validation ladder across old Androids, old PCs, and the 24 GB GPU rig.
7. Native mobile v1 as a household controller.

---

## 7. Bottom line

The project is past the "toy local dashboard" stage.

The next set of problems are not mostly model problems. They are:
- trust
- deployment consistency
- host integration
- cluster operations
- user-facing recovery flows

That is a good sign. It means the architecture is now colliding with real home-systems concerns.

---

## 8. Testing Status (2026-04-30)

### 8.1 Contract tests deployed (`wip/testing`)

| File | Tests | Covers |
|------|-------|--------|
| `backend/tests/test_contract_api.py` | 32 | `/health`, `/discover`, `/capabilities`, `/system/stats`, root, 404, STT tier asserts (7) |
| `backend/tests/test_bootstrap_routes.py` | 13 | `:17778 /setup/ca.crt`, `/setup/trust-status` |
| `backend/tests/test_persistence_api.py` | 71 | PronunCo persistence full CRUD |
| `testing/cases/talk-ui-check.spec.ts` | 3 | Playwright smoke for ME-21 Talk UI |

Run: `pytest backend/tests/ -v` against any node via `IHN_BASE_URL` / `IHN_BOOTSTRAP_URL`.

### 8.2 Per-platform test results

| Platform | Contract | Bootstrap | Tier | Notes |
|----------|----------|-----------|------|-------|
| **Python** (local) | 25/25 | 13/13 | `transcription` | Persistence 71/71 |
| **ME-21** (Android) | 25/25 | 0/13 | `transcription` | Bootstrap port up, just URL config issue |
| **iPhone 12 PM** (iOS) | 34/39 | 12/13 | `parallel` | 5× system/stats 404 (not implemented) |

### 8.3 Fixture packs

| Pack | Clips | Locales | Location |
|------|-------|---------|----------|
| macOS TTS | 20 | en-US, es-ES | `testing/fixtures/audio/` |
| Azure TTS | 100 | 10 locales | `testing/fixtures/audio/multilingual/` |

### 8.4 Key findings

- **7 contract gaps** between Python/Android documented at `testing/results/CROSS_PLATFORM_CONTRACT_FINDINGS_2026-04-28.md`
- **iPhone TLS + bootstrap working** (was `SSL_ERROR_SYSCALL`, now 33/38 without system/stats)
- **ME-21 ASR routing** validates: EN 10/10, ES 10/10 (Azure fixtures), 91/100 total
- **Azure TTS quality** dramatically better than macOS TTS for Spanish ASR
- **Tier contract** in place: `single|parallel|whisper|transcription|tts` — all asserts pass cross-platform
- **Whisper warmup** blocked: tier stays `parallel` after toggle (app rebuild pending)

### 8.5 Blockers for next session

| Blocker | Owner | What |
|---------|-------|------|
| iPhone system/stats endpoint | Claude | 5/45 tests fail on this — last missing endpoint |
| Whisper tier flip | Claude | `WhisperBundle.setReady(true)` called, tier stays `parallel` on toggle — app rebuild needed |
| iPhone ASR REST endpoint | Claude | No HTTP audio injection for iPhone ASR baseline |
| Python backend on Linux | Codex | Local backend crashes on start — avahi/DNS-related |
