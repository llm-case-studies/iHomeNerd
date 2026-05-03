# Expert Briefs Index

This is the entry point for agent-facing sprint packs.

## Philosophy

The workflow evolved in three steps:

1. Claude's uniform-web-ui architecture work gave the project a shared menu vs.
   lab framing.
2. Codex orchestration on the Dell turned that architecture into short,
   bounded Android sprint packs.
3. The Android work produced reusable reference packs that OpenCode agents can
   follow without carrying the whole architecture in context.

The current rule is: **initiative owns the folder, sprint owns the branch, test
request owns the validation lane**.

## Initiatives

| Initiative | Purpose | Index |
|---|---|---|
| `uniform-web-ui` | One canonical Command Center SPA served by every node. | `initiatives/uniform-web-ui/INDEX.md` |
| `iphone-to-mac-brain` | Phone-first onboarding into an Apple Silicon Mac home brain. | `initiatives/iphone-to-mac-brain/INDEX.md` |

## Reference Packs

| Reference | Lesson |
|---|---|
| `reference/2026-05-02_android-server-profile-surface/` | Small runtime + native UI slice with smoke evidence. |
| `reference/2026-05-02_android-model-catalog/` | Contract endpoint plus narrow UI tightening. |
| `reference/2026-05-02_android-uniform-web-serving/` | Honest web-serving behavior and result-driven validation. |

## Status Vocabulary

- `active`: in flight or ready to hand to an agent
- `queued`: planned but not yet issued
- `completed`: shipped, result captured, validation path known
- `paused`: waiting on rate limit, host availability, hardware, or another dependency
- `aborted`: intentionally stopped; result should explain why

