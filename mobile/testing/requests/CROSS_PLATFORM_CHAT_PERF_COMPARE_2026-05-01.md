# Cross-Platform On-Device Chat — Performance & Contract Compare

**Date:** 2026-05-01
**Time issued:** late-afternoon EDT
**Requester:** Claude (Mac mini / iHomeNerd workspace)
**Target tester:** DeepSeek / OpenCode testing session
**Targets:**
- iPhone 12 Pro Max (`iP12PM`, LAN IP from this node's **This node** tab; recently `192.168.0.220`)
- Motorola Edge 2021 or any Android node with a Gemma 4 E2B `.litertlm` / `.task` file already pushed to `llm/`
**Expected branch context:** `feature/mlx-llm-engine` (iOS) and current `mac-mini` Android build
**Why this exists:** Both platforms now host `/v1/chat` from a real on-device LLM. We've never measured them side by side, and the response shapes already diverge — we want one round trip that captures both perf reality and the contract gap.

---

## 1. The shared model

The fair anchor is **Gemma 4 E2B 4-bit** — the same weights run by two different runtimes:

| Platform | Runtime | Display name in UI | Repo / file |
|---|---|---|---|
| iOS | MLX-Swift (`mlx-swift-lm`) | "Gemma 4 E2B Instruct" | `mlx-community/gemma-4-e2b-it-4bit` |
| Android | LiteRT-LM (Google AI Edge) | first available | `gemma-4-E2B-it-int4.litertlm` (or `.task`) |

iOS also has Qwen 2.5 1.5B 4-bit — capture it too if Alex has it loaded, but Qwen is iOS-only so it cannot anchor the cross-platform compare.

---

## 2. What the two endpoints look like *today*

This is the contract gap we want documented. Don't try to reconcile it in this pass — just capture it.

### 2.1 iOS `/v1/chat`

Request:
```json
{ "prompt": "..." }
```

Response (200):
```json
{
  "text": "...",
  "processingTime": 4.23,
  "tokensPerSecond": 12.34,
  "model": "mlx-community/gemma-4-e2b-it-4bit",
  "backend": "mlx_ios"
}
```

### 2.2 Android `/v1/chat`

Request:
```json
{ "messages": [{ "role": "user", "content": "..." }],
  "language": "en",            // optional
  "model": "gemma-4-e2b-it"    // optional override
}
```

Response (200):
```json
{
  "response": "...",
  "role": "assistant",
  "content": "...",
  "model": "gemma-4-e2b-it",
  "backend": "android_gemma_local_litertlm_gpu",
  "language": null
}
```

Notes you'll need:
- Android does **not** report `processingTime` or `tokensPerSecond` in the body. Wall-clock from your test harness is the only timing signal.
- Android returns both `response` and `content` with the same string today. Treat `content` as canonical for parity with the iOS `text` field.

---

## 3. Preconditions

On iPhone:
1. Install `feature/mlx-llm-engine` build (already on device as of 2026-05-01).
2. Open **Models** → load **Gemma 4 E2B Instruct**. Wait for "Loaded".
3. Open **This node** → toggle **Hosting iHN node** on.
4. Keep app foregrounded, screen unlocked.

On Android:
1. Confirm `getExternalFilesDir(null)/llm/gemma-4-E2B-it*.litertlm` (or `.task`) is present. If it isn't, stop and flag — don't try to download from the test harness.
2. Open the app, toggle **Hosting iHN node** on.
3. Keep app foregrounded.

On the tester machine:
```bash
export IHN_IOS=https://192.168.0.220:17777
export IHN_ANDROID=https://<android LAN IP>:17777   # from device's This node tab

curl -sk "$IHN_IOS/health" | python3 -m json.tool
curl -sk "$IHN_ANDROID/health" | python3 -m json.tool
```

If either `/health` doesn't answer, flag the node as unreachable and run only the side that does respond. Don't block the whole pass on one device.

---

## 4. What we want you to do

### 4.1 Contract regression (additive)

Re-run the existing pack against both nodes:
```bash
IHN_BASE_URL="$IHN_IOS"     python3 -m pytest backend/tests/test_contract_api.py -q
IHN_BASE_URL="$IHN_ANDROID" python3 -m pytest backend/tests/test_contract_api.py -q
```
Expected: no regression vs your last per-platform pass.

### 4.2 New contract test for the shape divergence

Add `backend/tests/test_chat_cross_platform.py` (or extend `test_chat_contract.py`) with a single test that runs against `IHN_BASE_URL` and:

- Detects the platform from `/capabilities` `_detail.chat.backend`:
  - `mlx_ios` → iOS shape branch
  - any value starting with `android_` → Android shape branch
- Asserts the request shape that platform accepts (iOS rejects `messages`-only; Android rejects `prompt`-only).
- Asserts the response keys for that platform per §2.

Gate any live generation behind `IHN_RUN_LIVE_CHAT=1` so default CI doesn't fire models.

The point of this test is not to *judge* the divergence yet. It's to make sure neither side silently changes shape on us without a failing test.

### 4.3 Live perf compare (manual, once per platform)

When `IHN_RUN_LIVE_CHAT=1` is set, run this prompt set against each platform with **Gemma 4 E2B loaded**. Capture in a markdown table.

Prompts (use exactly these strings, in this order):

```text
P1: In one short sentence, say what device you are running on.
P2: Return exactly three comma-separated home automation ideas.
P3: Write a JSON object with keys status and model_family. No markdown.
P4: Explain in two sentences why local LLMs matter for privacy.
P5: List five short verbs that describe what a smart speaker does.
```

For each `(platform, prompt)`:

| Field | iOS source | Android source |
|---|---|---|
| `wall_clock_s` | tester wall-clock | tester wall-clock |
| `engine_processing_time_s` | response `processingTime` | n/a |
| `tokens_per_second` | response `tokensPerSecond` | n/a |
| `response_chars` | `len(text)` | `len(content)` |
| `model_id` | response `model` | response `model` |
| `backend` | response `backend` | response `backend` |
| `app_memory_pss_mb` *before* | `GET /system/stats` `app_memory_pss_bytes` ÷ 1024² | same field if exposed; else n/a |
| `app_memory_pss_mb` *after* | same | same |

Run each prompt **once cold (right after model-load)**, then **once warm (immediately after the cold run finished)**. Two rows per `(platform, prompt)`.

Don't grade the *quality* of the answers. We're after latency and stability, not correctness.

### 4.4 Repeat-stability smoke (per platform)

After §4.3 finishes, fire P1 ten times in a tight loop against the same loaded model. Record:

- pass/fail count (HTTP 200 + non-empty content)
- min / median / max `wall_clock_s`
- whether `app_memory_pss_mb` grew monotonically (rough — first vs last)
- whether the app stayed foregrounded / didn't crash

This is the part most likely to expose actor/state bugs and memory leaks.

---

## 5. What to write up

Drop one results doc:
`mobile/testing/results/CROSS_PLATFORM_CHAT_PERF_COMPARE_RESULTS_2026-05-01.md`

Include:

1. Branch/commit per device.
2. LAN IPs and whether each app stayed foregrounded.
3. Exact loaded model on each device.
4. Contract regression pass/fail counts (one row per platform).
5. Raw JSON for one successful chat call per platform (so the shape divergence is visible in the artifact).
6. The §4.3 perf table (one row per `platform × prompt × cold|warm`).
7. The §4.4 repeat-stability summary.
8. Any runtime gaps you hit, especially:
   - iOS: `/system/stats` not responding, `model: "unknown"` in chat response, app suspending mid-generation, repeat-prompt crash.
   - Android: missing model file, GPU backend init failure (then CPU fallback), `/system/stats` parity gap.
9. **Recommendation section (one paragraph):** which platform/runtime is currently more usable on these specific devices, and what's the single biggest gap blocking parity.

---

## 6. Hands-off zones

Please do not edit these files in this pass — they're owned by other tracks:

- `mobile/ios/ihn-home/IhnHome/Runtime/MLXEngine.swift`
- `mobile/ios/ihn-home/IhnHome/Runtime/HuggingFaceMLXBridge.swift`
- `mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift`
- `mobile/ios/ihn-home/IhnHome/Screens/ModelsScreen.swift`
- `mobile/ios/ihn-home/IhnHome/Screens/ChatScreen.swift`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/AndroidChatEngine.kt`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalNodeRuntime.kt`

Additive test files under `backend/tests/` and result docs under `mobile/testing/results/` are fine.

---

## 7. One-line kickoff to paste

> DeepSeek: please run a cross-platform chat perf compare between the iPhone (MLX) and Android (LiteRT-LM) Gemma 4 E2B nodes. Read `mobile/testing/requests/CROSS_PLATFORM_CHAT_PERF_COMPARE_2026-05-01.md` first. Add the cross-platform contract test, run the §4.3 perf table and §4.4 stability smoke under `IHN_RUN_LIVE_CHAT=1`, drop the results doc with a recommendation paragraph at the end.
