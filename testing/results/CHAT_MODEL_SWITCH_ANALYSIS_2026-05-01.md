# iPhone + ME-21: Chat Model Switch Analysis

**Date:** 2026-05-01
**Tester:** DeepSeek (wip/testing, iMac-Debian)

---

## 1. Model Switching — iPhone (MLX)

### 1.1 Switch Attempts Observed

| Step | Action | Result | Evidence |
|------|--------|:------:|----------|
| 1 | Alex loads Qwen (via app) | Qwen active | `model=Qwen2.5-1.5B-Instruct-4bit`, 32 tok/s |
| 2 | Alex loads Gemma (via app) | Gemma active, Qwen gone | `model=gemma-4-e2b-it-4bit`, 21 tok/s |
| 3 | Alex loads Qwen again (via app) | Gemma STILL active | `model=gemma-4-e2b-it-4bit` persists |

**Verdict:** Model switching IS supported through the app UI (step 1→2 worked),
but step 3 (Gemma→Qwen) either crashed silently or the load failed with Gemma
restored. This matches the documented crash recipe pattern.

### 1.2 No API Switching (Current Deploy)

- `/v1/chat` does NOT accept a `model` parameter
- No `/v1/chat/load` or `/v1/chat/switch` endpoint exists
- The API just uses whatever model `MLXEngine` holds

### 1.3 `qwen` Branch Has Full Solution (Not Deployed)

`MLXEngine.swift` (218 lines):
- `loadModel(name:path:)` — switch by local path
- `loadFromHub(configuration:)` — switch by HuggingFace config
- Drops old model containers before loading new (avoids GPU OOM)
- `Memory.clearCache()` between switches
- If new model fails → restores previous model (no stranding)
- `enforceMemoryBudget()` — blocks 4B+ models on 6GB devices

---

## 2. Model Comparison

| Metric | Qwen 2.5-1.5B | Gemma 4 | Gemma 4 (ME-21) |
|--------|:---:|:---:|:---:|
| Platform | iPhone MLX | iPhone MLX | Android LiteRT |
| Speed (tok/s) | **32** | 21 | — (not reported) |
| Math (17×24) | 408 ✅ | 408 ✅ | 408 ✅ |
| Code (is_prime) | — | ✅ 6k±1 opt | ✅ 6k±1 opt |
| Spanish | ¡Hola! ✅ | — | — |
| `messages` format | ❌ prompt only | ❌ prompt only | ✅ messages |
| Response field | `text` | `text` | `response` + `content` |

---

## 3. ME-21 Gemma Chat Results

Endpoint: `POST /v1/chat` (messages format), backend: `android_gemma_local_litertlm_gpu`

| Test | Prompt | Result | Tok/s |
|------|--------|--------|:-----:|
| Greeting | "Say hello in 3 words" | "Hello, how can I help?" | — |
| Math | "What is 17 times 24?" | "17 times 24 is 408." ✅ | — |
| Code | "Write Python is_prime function" | Full function with 6k±1 ✅ | — |

Gemma 4 on ME-21 produces identical code to Gemma 4 on iPhone — same
algorithm, same 6k±1 optimization, same variable names. This confirms
it's the same model architecture generating identical output across
platforms.

---

## 4. Contract Gaps

| Gap | Detail |
|-----|--------|
| **iPhone: prompt vs messages** | iPhone accepts `{"prompt":"..."}` format; ME-21 accepts `{"messages":[...]}`. Different request shapes. |
| **iPhone: response shape** | `{text, model, backend, tokensPerSecond, processingTime}`. ME-21: `{response, content, model, backend, language}`. Different field names. |
| **No API model switch** | Neither platform accepts a `model` parameter on `/v1/chat`. |
| **Single model active** | Only one model loaded at a time on both platforms. |

---

## 5. What's Needed for API Switching

1. Deploy `qwen` branch to iPhone (MLXEngine + HuggingFaceMLXBridge)
2. Add `/v1/chat/switch` or `POST /v1/chat` with `{"model":"qwen-..."}` to NodeRuntime
3. Expose available models in capabilities (`_detail.chat.models` or similar)
4. Add switch endpoint test to `test_chat_contract.py`
