# Expert Brief — MLX Chat Contract Cleanup

**Date:** 2026-05-03
**Initiative:** `iphone-to-mac-brain`
**Status:** active sprint
**Audience:** OpenCode coding agent on `Acer-HL` (`Qwen` or `DeepSeek`)

## Why This Sprint Exists

The first iPhone-to-Mac brain implementation spine added a provider-neutral
LLM layer and proved, with a fake MLX sidecar, that Python text generation can
route through `mlx_macos`.

Validation also found two contract gaps:

1. iOS and Python expose different `/v1/chat` body/response shapes.
2. Python returns an unhandled 500 when `IHN_LLM_PROVIDER=mlx` is configured
   but no MLX sidecar/model is available.

This sprint makes the Python backend's `/v1/chat` endpoint tolerant,
contract-clear, and safe for the Mac brain path.

## Execution Fence

- Repo: `iHomeNerd`
- Implementation host: `Acer-HL`
- Base branch: `origin/main`
- Working branch: `feature/mlx-chat-contract-cleanup`
- Merge target: `main`
- Build host: backend local
- Validation host: `iMac-Debian` / `testing/initiatives/iphone-to-mac-brain/2026-05-03_mlx-chat-contract-cleanup/`

## References

Read these first:

- `docs/expert-briefs/README.md`
- `docs/expert-briefs/initiatives/iphone-to-mac-brain/README.md`
- `docs/IPHONE_TO_MAC_BRAIN_SETUP_VISION_2026-05-01.md`
- `docs/APPLE_SILICON_NATIVE_MLX_HOSTING_2026-05-01.md`
- `origin/wip/testing:mobile/testing/results/IPHONE_TO_MAC_BRAIN_SETUP_AND_MLX_PROVIDER_RESULTS_2026-05-02.md` if available locally

Relevant sources:

- `backend/app/domains/language.py`
- `backend/app/llm.py`
- `backend/tests/test_language_api.py`
- `backend/tests/test_chat_contract.py`
- `backend/tests/test_llm_provider.py`

## Feature Goal

Make Python backend `POST /v1/chat`:

- accept `{"prompt": "..."}` requests
- continue accepting `{"messages": [{"role": "user", "content": "..."}]}`
- reject missing/invalid input with HTTP 400 and JSON `detail`
- catch provider-side `RuntimeError` / unreachable MLX sidecar failures and
  return HTTP 502 with JSON `detail`
- return a canonical response while preserving legacy fields:

```json
{
  "role": "assistant",
  "content": "...",
  "response": "...",
  "text": "...",
  "model": "mlx-community/gemma-4-e2b-it-4bit",
  "backend": "mlx_macos",
  "provider": "mlx"
}
```

Timing fields are welcome if cheap, but do not invent fake token rates. It is
acceptable for Python to omit `processingTime` and `tokensPerSecond` in this
sprint unless they are measured honestly.

## Acceptable Scope

Good changes:

- normalize request parsing inside `language.py`
- preserve current `messages` behavior for existing Python tests
- add focused tests for prompt requests, message requests, 400s, and 502s
- use existing `llm.provider_name()`, `llm.backend_name()`, and `llm.resolve()`
  helpers where useful

Do **not** turn this into:

- iOS endpoint changes
- frontend model selector work
- MLX sidecar implementation
- installer or launchd changes
- provider abstraction refactor beyond what the endpoint needs
- generic OpenAI compatibility work

## Build and Smoke Expectations

Run focused backend checks:

```bash
cd backend
source .venv/bin/activate
python -m pytest tests/test_llm_provider.py tests/test_language_api.py tests/test_chat_contract.py -q
```

Then run the fake-sidecar smoke from:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-03_mlx-chat-contract-cleanup/request.md
```

## Deliverables

Required:

1. implementation on `feature/mlx-chat-contract-cleanup`
2. focused tests committed with the code
3. result note at:
   `testing/initiatives/iphone-to-mac-brain/2026-05-03_mlx-chat-contract-cleanup/result.md`

## Done Means

- `POST /v1/chat` works with `prompt`.
- `POST /v1/chat` still works with `messages`.
- missing body fields return 400 JSON `detail`.
- MLX provider unavailable returns 502 JSON `detail`, not a traceback 500.
- response includes `content`, `text`, and legacy `response`.
- focused tests pass.

## If You Think The Approach Is Wrong

Push back before implementing if you think:

- `messages` should be the only canonical request shape
- Python should not include iOS-like `text`/`content` fields
- provider errors should be 503 instead of 502
- response model/provider metadata belongs in `/capabilities` only

That judgment is useful. Do not silently choose a different contract.

