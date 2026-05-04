# Expert Brief — iOS Chat Contract Unification

**Date:** 2026-05-03
**Initiative:** `uniform-web-ui`
**Status:** active sprint
**Audience:** OpenCode coding agent on `Acer-HL` (`Qwen` and `DeepSeek` are reasonable candidates; pick at handoff)

## Why This Sprint Exists

The backend `/v1/chat` was unified on 2026-05-03 (commit `4e9aa7b`):

- accepts both `{"prompt": "..."}` (legacy) and `{"messages": [...]}` (canonical)
- returns canonical fields: `role`, `content`, `text`, `response`, `model`, `backend`, `provider`
- 400 for invalid input, 502 for provider failures

The iOS handler at `mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift` (around line 583, function `handleChat`) was missed. It still:

- accepts only `{"prompt": "..."}` — `messages` is rejected as 400
- returns `text`, `processingTime`, `tokensPerSecond`, `model`, `backend` — missing `role`, `content`, `response`, `provider`

This means the SPA chat panel works against backend but breaks shape against iOS. Architecture v3 §8 names this exact pattern as the canonical fabric-breaker:

> Silent endpoint shape divergence... The current iOS `/v1/chat` accepting `{prompt}` while Android accepts `{messages}` is the canonical example — same path, different products. Bug, not feature.

This sprint closes the iOS half so the SPA can talk to any node and see the same shape.

## Execution Fence

- Repo: `iHomeNerd`
- Initiative: `uniform-web-ui`
- Implementation host: `Acer-HL` (or any Swift-aware host)
- Base branch: `origin/main`
- Working branch: `feature/uniform-web-ui/ios-chat-contract-unification`
- Merge target when validated: `main`
- Validation lane: `iMac-Debian` / `wip/testing`
- iOS build/deploy host: `mac-mini` (Xcode + paired iPhone 12 PM at `192.168.0.220`)

## References

Read these first:

- `docs/ARCHITECTURE_NODE_PARITY.md` — §3 (menu item anatomy), §8 (what breaks the menu)
- `docs/expert-briefs/initiatives/uniform-web-ui/README.md`
- `docs/expert-briefs/initiatives/iphone-to-mac-brain/completed/2026-05/2026-05-03_mlx-chat-contract-cleanup/01-brief.md` — the backend analogue
- `backend/app/domains/language.py` — backend reference implementation (the function we mirror)
- `backend/tests/test_chat_contract.py` — tests that prove the canonical shape

Relevant iOS sources:

- `mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift` — `handleChat` around line 583, route dispatch around line 364
- `mobile/ios/ihn-home/IhnHome/Runtime/MLXEngine.swift` — `generate(prompt:)` is the call site; do not change unless strictly necessary
- `mobile/ios/ihn-home/IhnHome/Screens/ChatScreen.swift` — native client of `MLXEngine.shared.generate`; not affected by HTTP change but worth a glance to confirm

## Feature Goal

Make iOS `POST /v1/chat` shape-compatible with the unified contract.

Smallest acceptable shape:

**Request — accept both:**
```json
{ "prompt": "Hi there" }
```
or
```json
{ "messages": [{ "role": "user", "content": "Hi there" }] }
```

If both are present, prefer `messages` and ignore `prompt`. If `messages` is empty or contains no `user` content, return 400.

**Response — canonical superset:**
```json
{
  "role": "assistant",
  "content": "Hello!",
  "text": "Hello!",
  "response": "Hello!",
  "model": "mlx-community/gemma-4-e2b-it-4bit",
  "backend": "mlx_ios",
  "provider": "mlx_ios",
  "processingTime": 4.23,
  "tokensPerSecond": 12.34
}
```

`role`, `content`, `text`, `response` carry the same string today (the assistant's reply) — this matches the backend canonical shape. `processingTime` and `tokensPerSecond` are iOS-specific additive timing fields and stay.

**Errors:**

- 400 with `{"detail": "..."}` for missing/invalid input (e.g., neither `prompt` nor `messages`, or `messages` empty/no user content)
- 502 with `{"detail": "..."}` for engine failures (already correct — keep behavior)
- 503 with `{"detail": "..."}` for OOM (already correct — keep behavior)

## Acceptable Implementation Scope

- Edit only `handleChat` in `NodeRuntime.swift`
- Inside the handler, normalize input to a single string (the user's last message) before calling `MLXEngine.shared.generate(prompt:)`. Don't re-architect MLXEngine.
- Build the response dictionary with the canonical fields plus the iOS-specific timing fields.
- Add a small comment noting the contract analogue with the backend (commit `4e9aa7b`) so future maintainers find it.

Do **not** turn this into:

- a multi-turn message-history change inside MLXEngine (the engine still gets a single prompt string this pass)
- a streaming response endpoint
- a refactor of the route dispatch
- new chat-related capabilities or models

## Build and Smoke Expectations

Before handoff:

1. Simulator build green:
   ```bash
   ssh mac-mini-m1
   cd ~/Projects/iHomeNerd/mobile/ios/ihn-home
   git fetch origin
   git checkout feature/uniform-web-ui/ios-chat-contract-unification
   xcodebuild -project IhnHome.xcodeproj -scheme IhnHome \
     -destination "generic/platform=iOS Simulator" \
     -configuration Debug -derivedDataPath ./build -skipMacroValidation build
   ```
2. Probe both shapes via curl (commands in the testing request).
3. Confirm response includes all canonical fields.

Real-device install on iPhone 12 PM is a plus but not required for this sprint — the handler logic is HTTP-shaped, simulator build proves it compiles and runs.

## Deliverables

Required:

1. implementation on `feature/uniform-web-ui/ios-chat-contract-unification`
2. concise result note using `02-result-template.md`
3. testing request fully completed at:
   - `testing/initiatives/uniform-web-ui/2026-05-03_ios-chat-contract-unification/result.md`
   - evidence captures under `testing/initiatives/uniform-web-ui/2026-05-03_ios-chat-contract-unification/evidence/`

## Done means

- code committed on the named branch
- simulator build green
- both request shapes return canonical response
- error paths still behave honestly
- result note names the final branch tip
- testing request is complete and validation-ready

## If you think the approach is wrong

We'd value pushback specifically on:

- handling of mixed-content `messages` arrays (multi-message history). Lean: take the last user message as the prompt for now; defer real multi-turn to a future sprint.
- whether `provider` should be `"mlx_ios"` (matches `backend`) or something more granular like `"mlx-swift"` — backend uses `provider: "mlx"` for its MLX path, so iOS being `"mlx_ios"` is fine but not deeply researched.
- whether response `role` should always be `"assistant"` or come from somewhere. Lean: hard-code `"assistant"` since this isn't a multi-turn endpoint yet.

Reply on the branch with your judgment before implementing if any of those land as substantively wrong.
