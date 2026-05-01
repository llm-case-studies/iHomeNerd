# Copilot Handoffs — Index

Bounded assignment briefs we send to copilot models (Gemini, Codex, Kimi, Qwen, DeepSeek, etc.) when we're at rate-limit edges or want them to own a small contained track.

## Naming convention

`YYYY-MM-DD_<copilot>_<short-topic>.md`

- date: when the brief was issued
- copilot: lowercase, single word (`gemini`, `codex`, `deepseek`, `kimi`, `qwen`, …)
- short-topic: kebab-case, ≤4 words

## Status table

| Issued | Copilot | Topic | Status | Outcome |
|---|---|---|---|---|
| 2026-04-28 | DeepSeek | [Testing kickoff](2026-04-28_deepseek_testing-kickoff.md) | completed | Kicked off the contract-test track; DeepSeek now owns cross-platform tests |
| 2026-05-01 | Gemini 3.1 Pro | [iOS Vision OCR](2026-05-01_gemini_ios-ocr.md) | completed | OCR shipped (commit b486b63); on Antigravity rate-leave for next week |

Status values: **active** (in flight), **completed** (work shipped + verified), **aborted** (returned without merge), **paused** (copilot on rate-leave).

## Why this folder exists

Copilot briefs are a different artifact class than strategy/spec docs. They have a short useful life (until the work ships), a specific owner outside our session, and a clear lifecycle. Pulling them out of `docs/` makes both this folder and the main `docs/` folder easier to scan.

Test-side artifacts (request → result pairs) live under `mobile/testing/requests/` and `mobile/testing/results/` and are not duplicated here.
