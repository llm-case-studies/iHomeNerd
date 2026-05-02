# Expert brief — Codex — Uniform web-UI build pipeline + Android serving

**Issued:** 2026-05-02
**Branch:** `feature/uniform-web-ui` (off `feature/mlx-llm-engine`)
**Architecture doc this brief operates under:** [`docs/ARCHITECTURE_NODE_PARITY.md`](../ARCHITECTURE_NODE_PARITY.md) — please read §1, §2 (menu vs lab), §6 (current state), §7 (build & distribution), §8 (what breaks the menu).
**Engagement framing:** reviewer-first, expert-if-you-want-it. We'd like your review of the approach below first. If you think it's right, we'd be glad to have you take it on as the expert. If you think it's wrong, that pushback is more valuable than implementing something flawed.

---

## Why we're asking you

Two reasons.

First, your strength on this team is **short-cycle contract-tactical work**: build glue, capability negotiation, asset routing — bounded scope, mostly-spec'd behavior, lots of small files that need to coordinate cleanly without architectural ambiguity. This slice is exactly that profile.

Second, you already wrote the **iPhone-led-Mac-brain-setup** track (`feature/iphone-mac-brain-setup`, merged 2026-05-02), so you have the most recent mental model of the iOS bootstrap channel and the Android `LocalNodeRuntime.kt` HTTP server. Lower context cost than asking someone fresh.

---

## What we're trying to do

The architecture doc establishes that **the SPA bundle is a single canonical artifact, served byte-identical by every node** that has the SPA-serving capability (which today is just the backend; iOS and Android both lack it). The bundle source is `frontend/` (Vite + React 19 + Tailwind 4); built output goes to `backend/app/static/{index.html, assets/*}`. The backend already serves from there via `app.mount("/assets", ...)` + `spa_root` route in `backend/app/main.py`.

We need the same bundle on **iOS and Android**, served from each platform's HTTP server alongside the existing `/v1/*` API endpoints.

---

## The slice we'd value your review on

### A. Build pipeline (`scripts/build-frontend.sh`)

Sketched approach:

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. Build the SPA. vite already outputs to backend/app/static/ per existing config
#    (see frontend/vite.config.ts and backend/app/main.py:96-115).
cd "$(dirname "$0")/.."
( cd frontend && npm install --silent && npm run build )

# 2. Mirror the built bundle into iOS Resources/Console/
rm -rf mobile/ios/ihn-home/IhnHome/Resources/Console
cp -R backend/app/static mobile/ios/ihn-home/IhnHome/Resources/Console

# 3. Mirror the built bundle into Android assets/console/
rm -rf mobile/android/ihn-home/app/src/main/assets/console
cp -R backend/app/static mobile/android/ihn-home/app/src/main/assets/console

echo "✓ frontend built; mirrored to iOS Resources/Console and Android assets/console"
```

We are **not** asking vite to output directly to the mobile folders. The single source of truth is `backend/app/static/`; mobile copies are derived. This keeps the backend's existing serving contract intact and makes the script's job purely "mirror what's there."

### B. Android serving (`mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalNodeRuntime.kt`)

The plumbing already exists: `serveBundledCommandCenterAsset(path)` (around line 1177) reads from `assets/<path>` and returns 200 with the right MIME type. Today it always returns `null` because no console assets are bundled. After step A, they will be.

The minimal change is a routing tweak. Today, route `GET /` falls through to `commandCenterIndexResponse()` which calls `serveBundledCommandCenterAsset("/index.html")` *or* falls back to inline `commandCenterHtml()`. The same routing should work for `GET /index.html`, `GET /assets/<file>`, and the SPA-fallback (any other GET path not in the API namespace returns `index.html` so React Router can take over). The `shouldServeCommandCenterSpa(path)` helper at line 1188 already encodes the API-namespace exclusion list — we should reuse it.

Verify: once `assets/console/index.html` is bundled, `https://<android-ip>:17777/` should return the React SPA HTML, not the inline dashboard.

### C. The fate of `commandCenterHtml()`

Architecture doc §9 (Phase 1) leaves this open: drop it outright, or graduate it to `/lab/dashboard` per §2's lab-surface concept. **Our lean is graduation** — the inline dashboard is currently the only thing showing per-node specifics like loaded packs and PronunCo demo, and that information is genuinely lab-content (Android specialty). Moving it to `/lab/dashboard` keeps it accessible to trusted personal-fleet nodes without polluting the menu.

**This decision is a request for your judgment.** We're not certain. If you think the inline dashboard should be removed outright in this pass and added back later, say so.

### D. iOS — explicitly NOT in your fence

Mirroring the SPA into iOS Resources/Console/ is in the build script, but **wiring iOS `NodeRuntime.swift` to actually serve those files is Claude's slice, not yours.** We're keeping the Swift fence with the principal.

---

## If you'd like to take it on as the expert

**SCOPE — edit only these:**
- `scripts/build-frontend.sh` (new file)
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalNodeRuntime.kt` (existing; surgical edit to routing — keep it minimal)

**DON'T touch:**
- `frontend/` source — the SPA is canonical, no edits needed for this slice
- iOS files (`mobile/ios/...`) — Claude's fence
- `backend/` — backend already works
- Android Compose UI files — orthogonal
- Refactoring unrelated to the routing tweak
- Adding tests/docs/abstractions beyond what's strictly needed

**Allowed extras:**
- A 5-line README in `scripts/` if it helps the next person
- Top-of-file comment in the script saying what it mirrors and why
- The `LocalNodeRuntime.kt` edit may include a one-line comment explaining the route precedence (assets-first, inline-fallback, then API/setup namespaces)

**STOP WHEN:**
1. `bash scripts/build-frontend.sh` exits 0 from a clean tree
2. `mobile/ios/ihn-home/IhnHome/Resources/Console/index.html` exists
3. `mobile/android/ihn-home/app/src/main/assets/console/index.html` exists
4. Android build passes (`./gradlew assembleDebug` from `mobile/android/ihn-home/`)
5. On a running Android node, `curl -sk https://<android-ip>:17777/` returns the SPA HTML (matches `backend/app/static/index.html` content hash). The inline dashboard is no longer the default.
6. `commandCenterHtml()` is either removed *or* moved to a `/lab/dashboard` route — your call, document the decision in the PR body.

**IF STUCK:** stop, leave a note describing what you got stuck on, don't improvise. We'd rather get a partial result with a clear blocker than a creative reinterpretation.

---

## If you think the approach is wrong

We genuinely want pushback on these specific assumptions:

1. **Mirror via cp vs symlink vs vite multi-output.** We chose `cp -R` for simplicity (works everywhere; mobile builds don't need to know about a frontend dev environment; no symlink-following landmines on Windows / iOS bundling). Alternative: configure vite to emit to all three locations directly. Worse for backend's existing serving contract; better for "single build step." Your take?
2. **Android assets folder location.** We're putting console under `mobile/android/ihn-home/app/src/main/assets/console/`. The existing `assets/asr-cache/` and `assets/asr-models/` set the precedent. Is there a gradle-aware reason to put it elsewhere (e.g., a generated source set)?
3. **`commandCenterHtml()` graduation vs deletion.** §C above. We lean graduation; you may disagree.
4. **Shape of the mirror.** Should we mirror only `index.html` + `assets/`, or the whole `backend/app/static/` directory? We say "whole directory" because vite may add files later (favicons, manifest.json) and we'd rather not maintain a per-platform allowlist.
5. **What about `/lab/*` routing on Android in this pass?** Architecture doc §2 names the lab surface but the implementation is open. We're *not* asking you to build the full `/lab/*` namespace in this brief — just the optional graduation of `commandCenterHtml` to `/lab/dashboard` if you go that route. Confirm that's the right scope.

If any of those land as "actually wrong," we'd much rather hear that than have you implement around it.

---

## What graduates this slice from review to ship

If you take it on:
- Single PR / branch off `feature/uniform-web-ui`
- Branch name: `feature/uniform-web-ui-codex` (or your preference)
- Commit subject: `Build pipeline: mirror SPA bundle to iOS Resources and Android assets`
- PR body: list what you decided on the open questions in §"If you think the approach is wrong"; especially the `commandCenterHtml` decision and the rationale for whatever graduation route you picked
- Verify checklist (the STOP WHEN list above) executed and recorded in the PR body
- We merge into `feature/uniform-web-ui` once the verify steps pass

If you push back / decline:
- Reply with the reasoning. No PR needed. Your review is the deliverable.

---

## Section markers we use for stream readability (OpenCode TUI convention)

If you respond inside an OpenCode-style TUI, please use these section markers in your reply so we can scan output cleanly:

```
## For You
<summary that's quick to read>

## My Reasoning
<judgment on the approach, what you'd change, why>

## What I Built
<if you took it on: file list + key decisions>

## Notes
<anything that didn't fit elsewhere>
```

Validated this convention with both Kimi K2.6 and Qwen on prior briefs; works well in OpenCode TUI without an MCP "display" server. Optional but appreciated.

---

End of brief. Reply on the branch when ready.
