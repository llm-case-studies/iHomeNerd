# Apple Silicon Native MLX Hosting for Desktop/Server iHN Nodes

**Date:** 2026-05-01
**Status:** Exploration / implementation plan
**Context:** `feature/mlx-llm-engine`, M1 Mac mini, iOS MLX pivot

## Short Answer

Yes. If an iHN desktop/server node is a Mac with Apple Silicon, the practical native path is to keep the existing Python FastAPI node and launchd service, then add an MLX-backed chat provider for macOS. This avoids porting the whole iOS Swift runtime to macOS and still gets the Apple-native Metal / unified-memory runtime.

The fastest MVP is a localhost MLX sidecar using `mlx_lm.server`, with iHN acting as the TLS, discovery, capability, and contract layer. The better production shape is an in-process Python provider using `mlx-lm` APIs, because it gives iHN direct control over model load, memory, metrics, and response normalization.

## What Exists Today

- iOS has a real MLX runtime:
  - `mobile/ios/ihn-home/IhnHome/Runtime/MLXEngine.swift`
  - `mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift`
  - backend identity advertised as `mlx_ios`
- Mac hosting already exists, but it is Ollama-first:
  - `install-ihomenerd-macos.sh` installs the Python backend into `~/.ihomenerd`
  - it creates `com.ihomenerd.brain` as a user launchd agent
  - it reuses or starts Ollama if available
  - it does not install or probe MLX / `mlx-lm`
- The gateway control plane already knows how to preflight and promote macOS via SSH:
  - `backend/app/domains/control_plane.py`
  - current preflight detects Darwin, RAM, Python venv, Ollama, launchd
  - it does not distinguish Intel Mac from Apple Silicon for model-worker recommendations
- Today's cross-platform perf request already added a Mac M1 runtime baseline section:
  - `mobile/testing/requests/CROSS_PLATFORM_CHAT_PERF_COMPARE_2026-05-01.md`

Local fact from this Mac mini on 2026-05-01:

| Field | Value |
|---|---|
| Model | Mac mini `Macmini9,1` |
| Chip | Apple M1 |
| Memory | 16 GB unified memory |
| macOS | 26.4.1 |
| Python on PATH | `/usr/bin/python3`, Python 3.9.6 |
| `mlx` / `mlx_lm` installed in PATH Python | no |

That Python detail matters: `backend/pyproject.toml` requires Python `>=3.11`, but this Mac's default `python3` is Apple's 3.9.6. The macOS installer and preflight should verify version, not only `import venv`.

## Current Upstream Shape

Primary sources checked on 2026-05-01:

- Apple describes MLX as optimized for Apple Silicon unified memory, with Python, Swift, C++, and C bindings.
- `mlx-lm` is the Python LLM package for Apple Silicon; it supports Hugging Face model loading, CLI generation, Python APIs, quantization, streaming generation, prompt caching, and an HTTP server.
- `mlx_lm.server` exposes an OpenAI-like `/v1/chat/completions` API on localhost by default. Its own docs warn it is not production-hardened, which is fine if iHN binds it to localhost only and exposes only the iHN HTTPS API to the LAN.
- MLX has explicit memory-management APIs including `mlx.core.clear_cache()`, `get_cache_memory()`, `set_cache_limit()`, and `set_wired_limit()`.
- The wired-memory path is macOS 15+ only. If models fit in RAM but run slowly, the system wired limit can be raised with `sudo sysctl iogpu.wired_limit_mb=<MB>`. iHN should detect and recommend this, not silently change it.

Sources:

- https://opensource.apple.com/projects/mlx/
- https://github.com/ml-explore/mlx-lm
- https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/SERVER.md
- https://ml-explore.github.io/mlx/build/html/usage/unified_memory.html
- https://ml-explore.github.io/mlx/build/html/python/_autosummary/mlx.core.clear_cache.html
- https://ml-explore.github.io/mlx/build/html/python/_autosummary/mlx.core.set_wired_limit.html
- https://github.com/ml-explore/mlx-swift-lm

## Architecture Options

### Option A: MLX sidecar, iHN adapter

Run:

```bash
mlx_lm.server --host 127.0.0.1 --port 11435 --model mlx-community/gemma-4-e2b-it-4bit
```

Then teach `backend/app/ollama.py` or a new provider layer to call:

```text
http://127.0.0.1:11435/v1/chat/completions
```

Pros:

- Smallest lift.
- Uses upstream server behavior directly.
- Separate launchd agent can be restarted without restarting iHN.
- Good enough for benchmarking and early node promotion.

Cons:

- Upstream docs say the server is not production-hardened.
- Metrics and memory control are indirect.
- Model switching is delegated to the sidecar API / process lifecycle.

Recommended use: first working Mac native node.

### Option B: in-process Python MLX provider

Add a provider like `backend/app/mlx_llm.py`:

- lazy import `mlx_lm`
- load one configured model at startup or first request
- preserve model and tokenizer in process
- generate through `mlx_lm.generate` or `stream_generate`
- record processing time, token rate, active/cache/peak memory
- call `mlx.core.clear_cache()` on explicit unload or model switch

Pros:

- Cleanest iHN integration.
- Better `/system/stats` and performance telemetry.
- Lets iHN enforce one-model-at-a-time memory behavior, similar to the iOS fix.
- Avoids exposing any second HTTP server, even on localhost.

Cons:

- More implementation and tests.
- Long generations run inside the FastAPI process unless carefully isolated.
- Need a lock/actor around model state to prevent concurrent request pileups.

Recommended use: production path after Option A proves the performance delta.

### Option C: Swift macOS node daemon

Reuse the iOS Swift MLX engine in a macOS target.

Pros:

- One Apple-side Swift MLX stack for iOS and macOS.
- Direct reuse of `MLXEngine.swift` concepts.

Cons:

- Bigger build, signing, launchd, and distribution story.
- Duplicates much of the Python backend surface unless we bridge it.
- The existing desktop/server iHN node is already Python.

Recommended use: defer unless we decide Mac nodes should become native apps, not headless server nodes.

## Implementation Work

### 1. Add an LLM provider seam

Create a provider abstraction instead of hard-coding Ollama everywhere:

```text
backend/app/llm.py
backend/app/ollama_provider.py
backend/app/mlx_provider.py
```

Minimal interface:

- `check_health()`
- `resolve(tier)`
- `chat(messages, model=None, tier="medium")`
- `generate(prompt, model=None, system=None, tier="medium")`
- `backend_id`
- `active_model`

Then migrate these callers:

- `backend/app/capabilities.py`
- `backend/app/domains/language.py`
- `backend/app/domains/docs.py` for generation only at first
- `backend/app/vision.py` stays Ollama until MLX VLM support is separately chosen
- `backend/app/ollama.py` remains as one provider

Keep embeddings on Ollama initially because document RAG currently depends on `ollama.embed()`.

### 2. Normalize `/v1/chat`

The repo currently has platform divergence:

- Python backend accepts `messages` and returns `response`
- iOS accepts `prompt` and returns `text`, `processingTime`, `tokensPerSecond`, `backend`
- Android accepts `messages` and returns `content` / `response`

For Mac MLX, return both legacy and canonical fields:

```json
{
  "role": "assistant",
  "content": "...",
  "response": "...",
  "text": "...",
  "model": "mlx-community/gemma-4-e2b-it-4bit",
  "backend": "mlx_macos",
  "processingTime": 4.23,
  "tokensPerSecond": 12.34
}
```

The request side should accept `messages` and single-shot `prompt`, with `messages` canonical for desktop/server nodes.

### 3. Extend macOS preflight

Add probes to `_preflight_script()`:

- `PYTHON_VERSION`
- `PYTHON_GE_311`
- `BREW_READY`
- `APPLE_SILICON=true` when `uname -m` is `arm64`
- `MAC_CHIP` from `system_profiler SPHardwareDataType`
- `MLX_READY` by importing `mlx`
- `MLX_LM_READY` by importing `mlx_lm`
- `MLX_METAL_READY` by `mlx.core.metal.is_available()` or `mlx.core.device_info()`
- `MLX_WIRED_LIMIT_MB` / `MLX_RECOMMENDED_WORKING_SET_MB` if import succeeds

Update recommendations:

- Darwin + arm64 + 8 GB or more should get `llm-worker` as a possible role even without NVIDIA.
- Darwin + Intel should remain Ollama/light-controller unless another backend is present.
- If Python is below 3.11, promotion should either install Homebrew Python or block with a clear message.

### 4. Extend macOS installer

Add an opt-in path:

```bash
IHN_MAC_LLM_BACKEND=mlx
IHN_MLX_MODEL=mlx-community/gemma-4-e2b-it-4bit
```

Installer changes:

- locate Python 3.11+; install `python@3.12` via Homebrew only with explicit installer approval or `IHN_AUTO_YES=1`
- `pip install mlx-lm` into the backend venv when `IHN_MAC_LLM_BACKEND=mlx`
- preload the configured model once, or start iHN and let first request download
- Option A only: create `com.ihomenerd.mlx.plist` bound to `127.0.0.1`
- set backend env:

```bash
export IHN_LLM_PROVIDER="mlx"
export IHN_MLX_MODEL="mlx-community/gemma-4-e2b-it-4bit"
export IHN_MLX_SERVER_URL="http://127.0.0.1:11435"
```

### 5. Add capabilities and stats

For `/capabilities`:

```json
"chat": {
  "available": true,
  "model": "mlx-community/gemma-4-e2b-it-4bit",
  "tier": "medium",
  "backend": "mlx_macos",
  "endpoint": "/v1/chat",
  "apple_silicon": true
}
```

For `/discover`:

- advertise Apple Silicon as an accelerator:

```json
{"kind": "apple_silicon", "name": "Apple M1", "memory": "unified"}
```

For `/system/stats`:

- last chat duration
- last prompt chars
- last response chars
- last backend
- last model
- MLX active/cache/peak memory if in-process
- process RSS if sidecar

### 6. Model recommendations

Conservative starter table:

| Mac unified memory | Starter models |
|---|---|
| 8 GB | Qwen 1.5B 4-bit, Gemma 2B 4-bit |
| 16 GB | Gemma 2B 4-bit, Qwen 7B 4-bit as measured/optional |
| 24 GB | 8B to 14B 4-bit candidates |
| 32 GB+ | larger 14B+ and MoE candidates, benchmark-gated |

The Mac mini M1 16 GB should start with the same model as the iPhone comparison:

```text
mlx-community/gemma-4-e2b-it-4bit
```

Then add:

```text
mlx-community/Qwen2.5-7B-Instruct-4bit
```

as the first "Mac can host what the phone should not" probe.

## Testing Plan

Phase 0: runtime baseline, already requested

- run `mlx_lm.generate` on the Mac mini with P1-P5 from `CROSS_PLATFORM_CHAT_PERF_COMPARE_2026-05-01.md`
- capture cold/warm timings, prompt TPS, generation TPS, response chars, RSS/peak memory

Phase 1: sidecar node

- install `mlx-lm`
- run MLX sidecar on `127.0.0.1:11435`
- point iHN backend at it
- verify:
  - `GET /health`
  - `GET /capabilities`
  - `POST /v1/chat`
  - `GET /system/stats`
  - mDNS discovery still works through the existing iHN server

Phase 2: contract test

Add or extend a cross-platform chat test that recognizes:

- `mlx_ios`
- `mlx_macos`
- `android_*`
- `ollama`

The test should assert accepted request shape and canonical response fields.

Phase 3: stability

- run the P1 prompt 10 times
- verify no monotonically growing memory footprint after warmup
- verify restart of `com.ihomenerd.brain` and, for Option A, `com.ihomenerd.mlx`
- verify model download failure yields a clean 503/502-style error, not a crashed service

## Risks And Decisions

- **Python version is the first real blocker.** Clean macOS can expose Apple Python 3.9 while the backend requires 3.11+. Fix preflight and installer before promoting Macs automatically.
- **Sidecar security is acceptable only if localhost-bound.** Never bind `mlx_lm.server` directly to LAN; expose the iHN API instead.
- **Memory behavior needs the same respect as iOS.** One loaded model per process at first; explicit cache clear on model switch in the in-process provider.
- **Do not set `iogpu.wired_limit_mb` automatically.** Detect, explain, and maybe provide a manual command when larger models need it.
- **Keep Ollama available as fallback.** MLX should be the native Apple fast path for chat, not an immediate replacement for every model-backed function.

## Recommendation

Build Option A first as a measured prototype, then replace it with Option B once the Mac M1 baseline proves worthwhile. This keeps scope tight: iHN's existing launchd, TLS, Home CA, mDNS, control plane, and frontend remain the desktop/server node. Only the local model provider changes from Ollama to native MLX when the target is an Apple Silicon Mac.
