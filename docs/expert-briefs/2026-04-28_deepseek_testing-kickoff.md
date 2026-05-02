# DeepSeek Testing Kickoff Notes

**Date:** 2026-04-28
**Author:** Claude (Mac mini M1)
**Audience:** DeepSeek session via OpenCode
**Companion doc:** `docs/TESTING_ROADMAP_AND_GUIDANCE_2026-04-28.md`

---

## Why this note exists

The testing roadmap describes the *whole* phased plan. This note narrows
that down to **what is safe to start on right now**, in parallel with
ongoing iOS TLS / runtime work, so DeepSeek can ship something useful
without stepping on Claude's commits or vice versa.

Read the roadmap first. This is just the "what to grab today" filter.

---

## What Claude is touching right now

Active workstream on the iOS catch-up:

- `mobile/ios/ihn-home/IhnHome/Runtime/*` (NodeRuntime, NodeIdentity,
  HTTPCodec, LocalAddresses)
- `mobile/ios/ihn-home/IhnHome/Screens/NodeScreen.swift`
- `mobile/ios/ihn-home/IhnHome/App/IhnHomeApp.swift`
- `mobile/ios/ihn-home/IhnHome/App/RootView.swift`
- `mobile/ios/ihn-home/project.yml`
- imminent: a Home CA + leaf chain replacing the per-node self-signed cert
  and a `:17778` bootstrap listener

If DeepSeek touches any of those files, expect collisions.

Status reference: `mobile/testing/results/IPHONE_12PM_FIRST_LAN_SERVING_PROBE_2026-04-28.md`
(verdict: advertising-only, TLS handshake broken — being fixed).

---

## Safe-to-start tasks for DeepSeek today

Pick any of these. They are additive, isolated from runtime code, and
won't collide with the iOS work above.

### Task A — Backend contract test pack (highest value first)

**Goal:** add `pytest` files under `backend/tests/` that exercise the
documented runtime contract from outside, with the backend running
locally as a subprocess or against an existing instance.

**Suggested first endpoints:**

- `GET /health`
- `GET /discover`
- `GET /capabilities` (if exposed by the backend; otherwise note as gap)
- `GET /system/stats`
- `GET /` and basic 404 behavior

**Reference contract** (already validated in the wild against ME-21,
see `mobile/testing/results/MOTOROLA_EDGE_2021_LAN_SERVING_PROBE_2026-04-28.md`):

- shapes for `available_capabilities`, `models`, `network_ips`, `port`,
  `binding`, `ok`, `status`, `product`, `version`
- `discover` should include `role`, `os`, `arch`, `ram_bytes`,
  `protocol`, `quality_profiles`, `network_hint`

**Allowed:**

- new files under `backend/tests/`
- new pytest fixtures (a session-scoped local backend launcher is fine)
- small helper modules under `backend/tests/_helpers/` if needed

**Not allowed without flagging:**

- modifying `backend/app/main.py`
- modifying `backend/app/certs.py`
- adding new runtime endpoints

**Existing example to follow:** `backend/tests/test_persistence_api.py`.

**Done = ** pytest reports per-endpoint pass/fail, contract assertions
named to match the roadmap (e.g. `test_health_shape`,
`test_discover_required_fields`).

---

### Task B — Top-level web harness skeleton

**Goal:** flesh out `testing/` with a working browser harness skeleton.
Do not wire the frontend; do not change Vite. Just stand up the harness
in isolation.

**Concrete deliverables:**

- `testing/web/package.json` (Playwright or @playwright/test pinned)
- `testing/web/playwright.config.ts` (single `chromium` project, base
  URL pointing at a local dev server you don't start automatically)
- one smoke spec under `testing/cases/` that loads the Command Center
  and asserts the page title or a known heading
- a `testing/fixtures/.gitkeep` to anchor the dir
- `testing/results/.gitignore` to keep generated reports out of git
- update `testing/README.md` only if the existing one is wrong about a
  detail you changed

**Allowed:**

- everything under `testing/`
- new isolated `package.json` (do **not** add Playwright to
  `frontend/package.json`)

**Not allowed without flagging:**

- changing anything under `frontend/src/`
- changing `frontend/package.json` or `frontend/vite.config.*`
- starting the frontend dev server from inside Playwright config

**Done = ** `cd testing/web && npx playwright test` runs and the smoke
spec passes against a frontend the operator started by hand.

---

### Task C — Speech fixture spec (docs only)

**Goal:** define the fixture format and matrix for the ASR routing test
that's already requested at
`mobile/testing/requests/ME21_CROSS_TEST_REQUEST_2026-04-28.md`.

**Concrete deliverables:**

- `mobile/testing/fixtures/SPEECH_FIXTURE_SPEC_2026-04-28.md` with:
  - audio format (sample rate, container, bit depth, channels)
  - per-language naming convention (e.g.
    `en-001-shortgreeting.wav`, `es-001-shortgreeting.wav`)
  - a starter phrase pack (10 EN + 10 ES, plain-text transcripts, mix of
    short/long, mix of read/conversational)
  - expected-result template (a markdown stub per phrase)
- no actual audio files yet; that's a separate task for later

**Allowed:**

- docs under `mobile/testing/fixtures/`

**Not allowed without flagging:**

- committing audio binaries
- changing the existing protocol or request docs

**Done = ** the spec is complete enough that whoever records the audio
later doesn't have to ask any clarifying questions.

---

### Task D — Bootstrap-trust contract test

**Goal:** automate what the iPhone probe and ME-21 probe both did by
hand against `:17778` — separate from the HTTPS runtime, so this one is
not blocked by the iOS TLS fix.

**Concrete deliverables:**

- `backend/tests/test_bootstrap_routes.py` (or similar)
- assertions for:
  - `GET http://<host>:17778/setup/ca.crt` returns 200, content-type is
    a PEM-shaped body, parses as a self-signed root cert
  - `GET http://<host>:17778/setup/trust-status` returns a JSON shape
    (this is currently broken on ME-21 — the test should drive
    fixing it)

**Allowed:**

- new pytest file
- a small helper that parses a cert with `cryptography` if needed

**Not allowed without flagging:**

- editing the trust route handlers themselves

**Done = ** the test runs locally against the backend, fails clearly
when the route is missing or hangs, passes when it's correct.

---

## Hands-off zones (until further notice)

Beyond the iOS files above:

- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/`
  — Android runtime, Codex's territory
- `frontend/src/` — the dirty modifications already in the working tree
  there are unrelated unfinished UI work; don't touch
- `backend/app/main.py`, `backend/app/certs.py` — runtime; tests yes,
  edits no
- `docs/TRUST_AND_TLS_POLICY_2026-04-28.md` — read-only reference

---

## Reporting expectation

For every task DeepSeek finishes, follow the roadmap's section 9
template. Specifically include:

1. files added
2. runtime files touched (should be zero)
3. how to run
4. what's still manual
5. assumptions made
6. whether anything affects app runtime (should be no)

Drop the report as a new file under `mobile/testing/results/` (for
mobile-flavored work) or under `testing/` (for the web harness).

---

## One-line kickoff to paste

> DeepSeek: start with Task A (backend contract tests under
> `backend/tests/`). Read `docs/TESTING_ROADMAP_AND_GUIDANCE_2026-04-28.md`
> first, then this kickoff note. Avoid the iOS files listed in the
> "What Claude is touching" section. Report in the section 9 template.
