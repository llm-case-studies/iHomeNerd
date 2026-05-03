# Test Request — MLX Chat Contract Cleanup

**Date issued:** 2026-05-03
**Initiative:** `iphone-to-mac-brain`
**Sprint:** `2026-05-03_mlx-chat-contract-cleanup`
**Target branch:** `feature/mlx-chat-contract-cleanup`

## What You Are Validating

Python backend `POST /v1/chat` should accept both iOS-style `prompt` requests
and Python/OpenAI-style `messages` requests, return a cross-platform response
shape, and report MLX provider failures as JSON 502 errors rather than
traceback 500s.

## Focused Tests

```bash
cd backend
source .venv/bin/activate
python -m pytest tests/test_llm_provider.py tests/test_language_api.py tests/test_chat_contract.py -q
```

## Fake MLX Sidecar Smoke

Terminal A:

```bash
cd backend
source .venv/bin/activate
cat >/tmp/ihn_fake_mlx_sidecar.py <<'PY'
from fastapi import FastAPI
import uvicorn

MODEL = "mlx-community/gemma-4-e2b-it-4bit"
app = FastAPI()

@app.get("/v1/models")
def models():
    return {"object": "list", "data": [{"id": MODEL, "object": "model"}]}

@app.post("/v1/chat/completions")
async def chat_completions(payload: dict):
    messages = payload.get("messages", [])
    last = messages[-1]["content"] if messages else ""
    return {
        "id": "fake-mlx",
        "object": "chat.completion",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": f"[FAKE MLX] {last}",
                },
                "finish_reason": "stop",
            }
        ],
    }

uvicorn.run(app, host="127.0.0.1", port=11435)
PY
python /tmp/ihn_fake_mlx_sidecar.py
```

Terminal B:

```bash
cd backend
source .venv/bin/activate
IHN_LLM_PROVIDER=mlx \
IHN_MLX_SERVER_URL=http://127.0.0.1:11435 \
IHN_MLX_MODEL=mlx-community/gemma-4-e2b-it-4bit \
IHN_HOST=127.0.0.1 \
IHN_PORT=17790 \
python -m app.main
```

Terminal C:

```bash
curl -sk https://127.0.0.1:17790/health | python -m json.tool

curl -sk -X POST https://127.0.0.1:17790/v1/chat \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Say hello in three words."}' \
  | python -m json.tool

curl -sk -X POST https://127.0.0.1:17790/v1/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Say hello in four words."}]}' \
  | python -m json.tool
```

Expected for both successful chat calls:

- HTTP 200
- `content` is present
- `text` is present
- legacy `response` is present
- `backend == "mlx_macos"`
- `provider == "mlx"`

## Error Smoke

Stop Terminal A so no MLX sidecar is running. Keep backend configured with
`IHN_LLM_PROVIDER=mlx`, then run:

```bash
curl -sk -i -X POST https://127.0.0.1:17790/v1/chat \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"This should fail cleanly."}'

curl -sk -i -X POST https://127.0.0.1:17790/v1/chat \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Expected:

- no-sidecar request returns HTTP 502 with JSON `detail`
- missing prompt/messages returns HTTP 400 with JSON `detail`
- neither response is a traceback HTML/plain 500

## Result Path

Write results to:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-03_mlx-chat-contract-cleanup/result.md
```

Put logs or raw command captures under:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-03_mlx-chat-contract-cleanup/evidence/
```

