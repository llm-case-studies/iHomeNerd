# Testing Roadmap and Guidance

**Date:** 2026-04-28  
**Audience:** Alex, DeepSeek, Codex, Claude, OpenCode sessions  
**Purpose:** give a safe, repo-native path for adding useful tests without
breaking active runtime work

---

## 1. Why this doc exists

The repo has grown quickly across:

- backend API/runtime work
- frontend Command Center work
- Android node-class runtime work
- iOS catch-up work
- mobile cross-testing notes

But the actual automated test surface is still thin.

At the same time, there is already enough active product/runtime work that
careless test setup could create churn or break working flows.

This document defines:

- what kinds of tests we want
- where they should live
- what DeepSeek or other agents can safely add now
- what they should not touch without explicit approval

---

## 2. Current state

As of this note:

- **Backend**
  - Python project with `pytest` already configured in `backend/pyproject.toml`
  - existing live-contract test example in
    `backend/tests/test_persistence_api.py`
- **Frontend**
  - TypeScript/Vite app with `build` and `lint`
  - no test runner committed yet
- **Mobile**
  - `mobile/testing/` exists for protocol, requests, and result notes
  - real-device/mobile browser testing is partly manual and partly guided

So:

- backend test additions are low-risk
- frontend test additions are useful, but should be isolated carefully
- mobile testing should start with guided fixture/result workflows, not a fake
  promise of fully autonomous real-device automation

---

## 3. Testing principles

### 3.1 Additive first

Prefer:

- new test files
- new fixtures
- new harness code
- new docs and result templates

Avoid:

- production refactors "to make tests easier"
- changing runtime behavior as part of adding tests

### 3.2 Deterministic over clever

Prefer:

- fixture audio
- fixture images
- fixed URLs
- explicit assertions
- captured artifacts

Avoid:

- flaky live microphone assumptions
- hidden dependence on ambient network state
- brittle snapshot testing of volatile UI

### 3.3 Separate test infrastructure from product runtime

Backend tests can live with the backend.

But browser/E2E/harness code should be isolated in a dedicated top-level
testing area, not mixed into the app runtime by default.

### 3.4 Real-device flows are semi-automated

Phones can help with testing, but:

- human taps
- human voice
- human hearing
- human judgment

still matter for many mobile and speech flows.

So we should build:

- guided harnesses
- evidence capture
- result generation

not pretend all real-device QA is CI-ready.

---

## 4. Safe scope for DeepSeek right now

DeepSeek may safely work in these areas:

### 4.1 Backend contract tests

Safe targets:

- `backend/tests/`
- new pytest files
- pure endpoint/contract validation
- fixtures that hit a known live node or a controlled local runtime

Good first subjects:

- `/health`
- `/discover`
- `/capabilities`
- `/system/stats`
- bootstrap/trust routes
- persistence routes where stable

### 4.2 Browser/E2E test harness

Safe target:

- new top-level `testing/` subtree

Suggested shape:

```text
testing/
  README.md
  web/
  cases/
  fixtures/
  results/
```

Good first targets:

- Command Center load
- tab presence / capability gating
- basic health and system page assertions
- fixture-based ASR upload
- later OCR fixture tests

### 4.3 Mobile testing docs and guided scenarios

Safe target:

- `mobile/testing/`

Good first additions:

- more request/result templates
- standard phrase packs
- standard OCR image fixtures
- device scorecards

---

## 5. Off-limits without explicit approval

DeepSeek should **not** change these as part of initial testing work unless
blocked and explicitly told to proceed:

- `backend/app/main.py`
- `backend/app/certs.py`
- Android runtime code under
  `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/`
- iOS runtime / networking code under
  `mobile/ios/ihn-home/IhnHome/Networking/`
- frontend runtime behavior under `frontend/src/` unless the task is
  specifically a test-harness UI task
- trust/TLS behavior
- shipping app routing or capability logic

The rule is:

- **tests first**
- **runtime changes only by exception**

---

## 6. Recommended roadmap

### Phase 1 — Stabilize backend test baseline

Owner shape:

- good fit for DeepSeek

Deliverables:

- pytest coverage for core health/control-plane endpoints
- clear pass/fail output
- no runtime changes required

Why first:

- lowest risk
- fastest value
- creates a contract baseline for Android/iOS/mobile work

### Phase 2 — Create top-level web testing harness

Deliverables:

- `testing/README.md`
- browser harness setup
- first deterministic web checks
- fixture/result storage pattern

Why second:

- contains test tooling away from product runtime
- lets us test the real Command Center without destabilizing frontend build

### Phase 3 — Fixture-based speech tests

Deliverables:

- prerecorded EN/ES fixture uploads
- backend selection assertions
- transcript capture
- latency capture
- markdown result output

Why third:

- useful immediately for current Android speech work
- much less flaky than live mic tests

### Phase 4 — OCR fixture tests

Deliverables:

- image fixture corpus
- extracted text assertions
- route to grounded drill generation later

Why fourth:

- directly supports the next product area after ASR
- enables grounded PronunCo flows

### Phase 5 — Guided real-device mobile browser tests

Deliverables:

- reusable mobile scenario checklist
- device/browser result artifacts
- timing / transcript / screenshot capture

Why fifth:

- valuable, but not truly autonomous
- should sit on top of the earlier deterministic harnesses

### Phase 6 — Future `iHN` / `iTestWell` testing substrate

Longer-term vision:

- iHN as evidence collector and result synthesizer
- separate app on top for testing third-party apps
- overlap with `Investigate` / `iScamHunter` style evidence workflows

This is future-facing, not the first DeepSeek task.

---

## 7. Suggested file layout

### Backend

- `backend/tests/`

### Mobile testing protocol / human-guided flows

- `mobile/testing/protocols/`
- `mobile/testing/requests/`
- `mobile/testing/results/`

### General-purpose web / app testing harness

Recommended new area:

```text
testing/
  README.md
  web/
  cases/
  fixtures/
  results/
```

Suggested content:

- `web/` — browser harness code
- `cases/` — declarative scenarios
- `fixtures/` — audio/images/html captures
- `results/` — generated reports not necessarily committed by default

---

## 8. Good first tasks for DeepSeek

### Task A — backend health/control-plane tests

Goal:

- expand endpoint contract coverage under `backend/tests/`

Allowed changes:

- new test files
- small test helpers
- no production runtime changes

### Task B — top-level testing harness skeleton

Goal:

- create `testing/README.md`
- propose initial harness layout
- optionally scaffold isolated browser test package

Allowed changes:

- new `testing/` files
- isolated config only
- do not rewire frontend build

### Task C — mobile/browser speech fixture spec

Goal:

- define fixture names
- define expected outputs
- define result shape

Allowed changes:

- docs
- fixture metadata
- result templates

### Task D — OCR fixture plan

Goal:

- create the first structured image-fixture roadmap

Allowed changes:

- docs only unless explicitly asked to add the actual fixture harness

---

## 9. Reporting expectations

Every DeepSeek test contribution should report:

1. what files were added
2. what runtime code, if any, was touched
3. how to run the tests
4. what remains manual
5. what assumptions were made
6. whether any added tooling is isolated or affects app runtime

If blocked, DeepSeek should stop and say:

- what production change appears needed
- why the current test scope cannot proceed safely

---

## 10. Practical operator note

For now, this is the preferred message to another agent:

> Add tests additively. Start with backend contract tests or a top-level
> isolated testing harness. Do not modify production runtime code unless you
> are blocked and explicitly call that out first.

That is the line we should keep repeating until the repo has a mature testing
surface.
