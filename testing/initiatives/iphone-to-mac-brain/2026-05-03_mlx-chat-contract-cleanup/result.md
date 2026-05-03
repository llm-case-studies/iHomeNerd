# Result — MLX Chat Contract Cleanup

**Status:** implemented

## Summary

- branch / commit tested: `feature/iphone-to-mac-brain/mlx-chat-contract-cleanup`
- implementation host: `Acer-HL`
- validation host: `iMac-Debian` (smoke pending — see Follow-Up)
- verdict: implementation complete, unit tests pass, local 400/502 verified

## Focused Tests

- `test_llm_provider.py`: **3 passed** (unit tests for provider layer)
- `test_language_api.py`: 11 tests written (6 new for chat contract; need live backend with Ollama/MLX for integration pass)
- `test_chat_contract.py`: 5 tests (added `test_chat_messages_response_shape`; gated behind `IHN_RUN_LIVE_CHAT=1`)

### Unit test run (no server needed)

```
python3 -m pytest tests/test_llm_provider.py -q
3 passed
```

### Local 400/502 smoke (with server, no LLM backend)

| Probe | Outcome | Notes |
|---|---|---|
| 400: empty body `{}` | 400 `{"detail":"Request must include a non-empty 'prompt' string or 'messages' array."}` | clean JSON |
| 400: non-string prompt `{"prompt":123}` | 400 same detail | clean JSON |
| 400: empty prompt `{"prompt":""}` | 400 same detail | clean JSON |
| 502: valid prompt, no Ollama | 502 `{"detail":"No model available for tier 'medium'. Available: set()"}` | RuntimeError caught, clean JSON, no traceback |

## Response Shape

The `/v1/chat` endpoint now returns:

```json
{
  "role": "assistant",
  "content": "<result text>",
  "response": "<result text>",
  "text": "<result text>",
  "model": "gemma4:e4b",
  "backend": "ollama",
  "provider": "ollama"
}
```

- `content`: present (same as result)
- `text`: present (same as result)
- `response`: present (legacy field, same as result)
- `backend`: `"ollama"` or `"mlx_macos"` from `llm.backend_name()`
- `provider`: `"ollama"` or `"mlx"` from `llm.provider_name()`

Timing fields (`processingTime`, `tokensPerSecond`) are omitted from Python for now, as specified in the brief.

## Changes Made

### `backend/app/domains/language.py`
- Imported `HTTPException`, `provider_name`, `backend_name`, `resolve`
- Chat endpoint now accepts both `prompt` (string) and `messages` (array)
- `prompt` is normalized to `messages = [{"role": "user", "content": prompt}]`
- Missing/invalid input returns HTTP 400 with JSON `detail`
- `RuntimeError` from LLM layer (no model, MLX unreachable) returns HTTP 502 with JSON `detail`
- Response includes canonical fields: `role`, `content`, `text`, `response`, `model`, `backend`, `provider`

### `backend/tests/test_language_api.py`
- Renamed `test_chat_returns_200` → `test_chat_returns_200_with_messages`
- Added `test_chat_returns_200_with_prompt`
- Added `test_chat_response_shape` (checks all canonical fields)
- Added `test_chat_has_legacy_response_field` (preserves existing check)
- Replaced `test_chat_messages_required` with `test_chat_missing_input_returns_400`
- Added `test_chat_empty_prompt_returns_400`
- Added `test_chat_prompt_non_string_returns_400`

### `backend/tests/test_chat_contract.py`
- Added `test_chat_messages_response_shape` (gated behind `IHN_RUN_LIVE_CHAT=1`)

## Follow-Up

- next recommended sprint: run the fake MLX sidecar smoke from `request.md` on the validation host (`iMac-Debian`) with Ollama available to verify the full 200 response shape and cross-platform contract
