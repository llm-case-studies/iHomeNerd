# iPhone Node - MLX Chat + Model Catalog Test Request

**Date:** 2026-05-01
**Time issued:** 13:53 EDT
**Requester:** Codex (Mac mini / iHomeNerd workspace)
**Target tester:** DeepSeek / OpenCode testing session
**Target device:** iPhone 12 Pro Max (`iP12PM`; use the LAN IP shown in the app's **This node** tab)
**Target role:** iOS node-class host with on-device MLX chat
**Expected branch context:** `feature/mlx-llm-engine` at or after the Codex MLX bridge/model-catalog changes on 2026-05-01

---

## 1. What changed since your last run

### 1.1 iOS now has an MLX chat path

The iOS node exposes:

```http
POST /v1/chat
Content-Type: application/json

{"prompt":"..."}
```

Successful response shape:

```json
{
  "text": "<model reply>",
  "processingTime": 4.23,
  "tokensPerSecond": 12.34,
  "model": "mlx-community/gemma-4-e2b-it-4bit",
  "backend": "mlx_ios"
}
```

Bad request shape:

```json
{"detail":"expected JSON with 'prompt' key"}
```

The endpoint requires a model to already be loaded in the app's **Models**
tab. If no model is loaded, a valid prompt returns 502 with
`MLX inference failed: Model not loaded.`

### 1.2 The MLX loader path changed

The app no longer uses `MLXHuggingFace` macros directly. Instead it has a
small normal Swift bridge that roots `HuggingFace` and `Tokenizers`
explicitly:

- `mobile/ios/ihn-home/IhnHome/Runtime/HuggingFaceMLXBridge.swift`
- `mobile/ios/ihn-home/IhnHome/Runtime/MLXEngine.swift`
- `mobile/ios/ihn-home/project.yml`

This fixed the build issue from `mobile/ios/ihn-home/mlx_sdk_migration_issues.md`
without relying on macro expansion leaking transitive modules into the app
target.

### 1.3 The Models tab now has two model choices

The iOS UI lists:

| UI name | MLX repo id | Size shown | Quantization |
|---|---|---:|---|
| Qwen 2.5 Instruct | `mlx-community/Qwen2.5-1.5B-Instruct-4bit` | 1.5B parameters | 4-bit |
| Gemma 4 E2B Instruct | `mlx-community/gemma-4-e2b-it-4bit` | 2B parameters | 4-bit |

Gemma E2B has been manually loaded successfully on iPhone 12 Pro Max.

### 1.4 The RAM preflight guard was corrected

Previous behavior rejected `Qwen2.5-1.5B-Instruct-4bit` because the guard
matched `"4b"` inside `"4bit"` and treated it like a 4B-parameter model.

The guard now parses parameter sizes (`1.5B`, `2B`, `7B`, etc.) and ignores
quantization labels like `4bit`.

---

## 2. Preconditions for live tests

On the iPhone:

1. Install the `feature/mlx-llm-engine` app build.
2. Open **Models**.
3. Load either Gemma 4 E2B or Qwen 2.5 1.5B.
4. Open **This node**.
5. Turn **Hosting iHN node** on.
6. Keep the app foregrounded and the phone unlocked during generation.

On the tester machine:

```bash
export IHN_BASE_URL=https://IPHONE_LAN_IP:17777
curl -sk "$IHN_BASE_URL/health" | python3 -m json.tool
curl -sk "$IHN_BASE_URL/capabilities" | python3 -m json.tool
```

If `/health` does not answer, stop and flag the node as unreachable before
running the MLX tests.

---

## 3. What we'd like you to add

### 3.1 Contract regression

Re-run the existing contract pack against the iPhone:

```bash
IHN_BASE_URL="$IHN_BASE_URL" \
  python3 -m pytest backend/tests/test_contract_api.py -q
```

Expected:

- Existing health/discover/capabilities/system-stats tests should not regress.
- `chat` may appear in the flat capability map and in `_detail.chat`.
- `_detail.chat.backend` should be `"mlx_ios"`.
- `_detail.chat.endpoint` should be `"/v1/chat"`.

If current tests fail because they assumed iOS had no chat capability, update
the tests so iOS chat is an additive capability rather than an expected gap.

### 3.2 New contract tests for chat capability

Add either a new class in `backend/tests/test_contract_api.py` or a focused
new file such as `backend/tests/test_chat_contract.py`.

For any node advertising `chat`:

- Flat `chat` value is a boolean.
- `_detail.chat.available` is a boolean.
- `_detail.chat.backend` is `"mlx_ios"` for iOS nodes, or another documented
  backend string for non-iOS nodes.
- `_detail.chat.endpoint` is `"/v1/chat"`.
- If `_detail.chat.loaded_pack_name` is present, it is one of:
  - `mlx-community/Qwen2.5-1.5B-Instruct-4bit`
  - `mlx-community/gemma-4-e2b-it-4bit`

Do not require `loaded_pack_name` to be present in `/capabilities` yet; the
capability snapshot is sync and may not expose actor-isolated MLX state. The
live `/v1/chat` response is the source of truth for loaded model identity.

### 3.3 New endpoint-shape tests for `/v1/chat`

These tests can run against a live iPhone node. Gate the successful-generation
test behind an explicit env var so normal CI does not download or run models:

```bash
IHN_BASE_URL=https://IPHONE_LAN_IP:17777 \
IHN_RUN_LIVE_CHAT=1 \
python3 -m pytest backend/tests/test_chat_contract.py -q
```

Suggested asserts:

1. Missing prompt returns 400:

```bash
curl -sk -X POST "$IHN_BASE_URL/v1/chat" \
  -H 'Content-Type: application/json' \
  -d '{}' | python3 -m json.tool
```

Expected:

- status 400
- JSON has `detail`
- detail mentions `prompt`

2. Malformed JSON returns a non-2xx response and does not crash the runtime.

3. Valid prompt with no loaded model returns 502 and a JSON `detail` that
mentions "Model not loaded" or "MLX inference failed".

4. Valid prompt with a loaded model returns 200:

```bash
curl -sk -X POST "$IHN_BASE_URL/v1/chat" \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"In one short sentence, say what device you are running on."}' \
  | python3 -m json.tool
```

Expected:

- `text` is a non-empty string.
- `processingTime` is numeric and greater than 0.
- `tokensPerSecond` is numeric and non-negative.
- `backend` is `"mlx_ios"`.
- `model` is one of:
  - `mlx-community/Qwen2.5-1.5B-Instruct-4bit`
  - `mlx-community/gemma-4-e2b-it-4bit`

5. Warm repeat smoke:

Run three short prompts in sequence against the same loaded model. Record:

- status code
- response text length
- `processingTime`
- `tokensPerSecond`
- whether the app stayed responsive

This is not a strict benchmark yet; it is a regression smoke for crashes,
memory pressure, and actor/state bugs.

### 3.4 Model-catalog static regression

Please add a small static check that can run on non-macOS testers without
building Xcode. It can be a Python pytest that reads
`mobile/ios/ihn-home/IhnHome/Screens/ModelsScreen.swift` and asserts:

- the Qwen row uses `LLMRegistry.qwen2_5_1_5b`
- the Gemma row uses `LLMRegistry.gemma4_e2b_it_4bit`
- the file contains the repo-visible display facts:
  - `1.5B parameters`
  - `2B parameters`
  - `4-bit`

This is intentionally a simple source-level regression test. The real UI still
needs manual screenshot/device verification, but this catches accidental
catalog removal on Linux/CI.

### 3.5 RAM-guard regression test guidance

The RAM guard is Swift-only and currently private inside `MLXEngine`. Please
do **not** refactor runtime code just to unit-test it.

Instead, capture it as either:

- a static source test confirming we no longer use
  `configuration.name.lowercased().contains("4b")`, or
- a recommended future Swift unit test if/when the parsing helper moves into a
  small testable model-catalog module.

The behavior we care about:

- `Qwen2.5-1.5B-Instruct-4bit` must be treated as 1.5B, not 4B.
- `gemma-4-e2b-it-4bit` must be treated as 2B/e2b, not rejected due to `4bit`.
- real 4B+ names should still be blocked on devices below the calibrated RAM
  threshold.

---

## 4. Manual live-device matrix

Run only what Alex confirms is already loaded. Do not force both large model
downloads unless Alex explicitly wants that session.

| Loaded model | `/v1/chat` smoke | Repeat x3 | Notes to capture |
|---|---:|---:|---|
| Gemma 4 E2B | required | required | first-token latency impression, response quality, memory pressure |
| Qwen 2.5 1.5B | optional | optional | whether old false OOM is gone |

Good smoke prompts:

```text
In one short sentence, say what device you are running on.
```

```text
Return exactly three comma-separated home automation ideas.
```

```text
Write a JSON object with keys status and model_family. No markdown.
```

For quality, do not assert exact text. Assert non-empty response, bounded
latency notes, and no runtime crash.

---

## 5. Reporting back

Drop a new result file under `mobile/testing/results/`, named like:

`IPHONE_12PM_MLX_CHAT_RESULTS_2026-05-01.md`

Include:

1. Exact branch/commit tested.
2. iPhone LAN IP and whether the app was foregrounded.
3. Which model was loaded before `/v1/chat`.
4. Contract regression pass/fail count.
5. New chat/model-catalog tests added and how to run them.
6. Raw JSON for:
   - `/capabilities` `_detail.chat`
   - `/v1/chat` missing-prompt response
   - one successful `/v1/chat` response
7. Latency/tokens-per-second table for the repeat smoke.
8. Any runtime gaps found, especially:
   - `/capabilities` lacks `loaded_pack_name`
   - `/v1/chat` returns `model: "unknown"`
   - app suspends/backgrounds during generation
   - memory-pressure crash after repeated prompts

---

## 6. Hands-off zones

Please do not edit these runtime/UI files as part of the testing pass:

- `mobile/ios/ihn-home/IhnHome/Runtime/MLXEngine.swift`
- `mobile/ios/ihn-home/IhnHome/Runtime/HuggingFaceMLXBridge.swift`
- `mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift`
- `mobile/ios/ihn-home/IhnHome/Screens/ModelsScreen.swift`
- `mobile/ios/ihn-home/project.yml`

Additive test files under `backend/tests/`, static test helpers under
`mobile/testing/`, and result docs under `mobile/testing/results/` are fine.

---

## 7. One-line kickoff to paste

> DeepSeek: please add contract/static tests for the new iPhone MLX chat
> path and Qwen/Gemma model catalog. Read
> `mobile/testing/requests/IPHONE_12PM_MLX_CHAT_AND_MODEL_CATALOG_TEST_REQUEST_2026-05-01.md`
> first. Use the live iPhone only when `IHN_RUN_LIVE_CHAT=1`; otherwise keep
> generation tests skipped and report the manual live results separately.
