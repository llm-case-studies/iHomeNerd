# Sprint Pack: iOS Chat Contract Unification

The iOS counterpart to the completed `iphone-to-mac-brain/2026-05-03_mlx-chat-contract-cleanup` sprint. The backend `/v1/chat` was unified on 2026-05-03 (commit `4e9aa7b`). The iOS handler at `NodeRuntime.swift:583` was missed and still returns the pre-unification shape.

## Why this sprint

Architecture v3 §8 ("What breaks the menu") names *silent menu-item shape divergence* as the canonical example of a fabric-breaker:

> The current iOS `/v1/chat` accepting `{prompt}` while Android accepts `{messages}` is the canonical example — same path, different products. Bug, not feature; cleanup is in §9 Phase 2.

The backend just shipped Phase 2 for itself. This sprint closes the iOS half. After it lands, the SPA's chat panel and the upcoming model-selector panel will see consistent shape regardless of which node they're talking to.

## Sprint topic

`feature/uniform-web-ui/ios-chat-contract-unification`

Goal:

- iOS `POST /v1/chat` accepts both `{"prompt": "..."}` and `{"messages": [...]}` request shapes (matches `4e9aa7b`)
- iOS chat response includes the canonical fields: `role`, `content`, `text`, `response`, `model`, `backend`, `provider` — superset of both old shapes so old clients still work
- Honest 400 for missing/invalid input, 502 for engine failures, 503 for OOM (already correct in iOS handler — keep)
- Existing iOS-specific timing fields (`processingTime`, `tokensPerSecond`) preserved as additive

## Files in this pack

- `00-opencode-kickoff.md` — paste-ready prompt
- `01-brief.md` — what the coding agent should do
- `02-result-template.md` — how the coding agent reports back
- `03-merge-note-template.md` — how the owner records promotion/hold

The validator request for this sprint lives at:

- `testing/initiatives/uniform-web-ui/2026-05-03_ios-chat-contract-unification/request.md`

## Reference: backend analogue

The completed backend cleanup is the closest reference:

- `docs/expert-briefs/initiatives/iphone-to-mac-brain/completed/2026-05/2026-05-03_mlx-chat-contract-cleanup/`
- Backend code: `backend/app/domains/language.py`
- Tests: `backend/tests/test_chat_contract.py`

The iOS implementation should mirror the backend's normalize-prompt-to-messages-internally pattern.
