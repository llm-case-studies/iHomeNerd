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
| 2026-05-01 | Kimi K2.6 | [MLX model-switch crash fix](2026-05-01_kimi_mlx-model-switch-crash.md) | completed | Fix shipped (commit 6e19331); Kimi found `MLX.Memory.clearCache()` after the original load-then-swap pattern failed on 6 GB devices. Recipe at `docs/MLX_MODEL_SWITCH_MEMORY_RECIPE.md`. Cost ~$2, output verbose but high-quality. |
| 2026-05-01 | Qwen | [`/system/stats` device-state fields](2026-05-01_qwen_system-stats-device-state.md) | completed | Shipped clean (merged as `f88e509` on 2026-05-02). All 4 fields verified live via curl on iPhone 12 PM. Bonus: Qwen also wrote `ae52f8b` error-taxonomy doc — out of fence but content kept; implementation queued as Task #1 (`IhnEngineError` rename). |

Status values: **active** (in flight), **completed** (work shipped + verified), **aborted** (returned without merge), **paused** (copilot on rate-leave).

## Why this folder exists

Copilot briefs are a different artifact class than strategy/spec docs. They have a short useful life (until the work ships), a specific owner outside our session, and a clear lifecycle. Pulling them out of `docs/` makes both this folder and the main `docs/` folder easier to scan.

Test-side artifacts (request → result pairs) live under `mobile/testing/requests/` and `mobile/testing/results/` and are not duplicated here.
