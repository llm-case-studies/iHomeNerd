# iPhone-to-Mac Brain Setup + MLX Provider Routing Test Request

**Date:** 2026-05-02
**Requester:** Codex (Mac mini / iHomeNerd workspace)
**Target tester:** DeepSeek / OpenCode testing session on iMac-Debian
**Target branch:** `feature/iphone-mac-brain-setup`
**Target commit:** at or after `7ca398b` (`Add MLX text provider routing`)
**Target devices:** iPhone 12 Pro Max if reachable; local Linux backend harness on iMac-Debian; optional Mac mini M1 runtime smoke

---

## 1. Why This Request Exists

The branch adds the first product spine for a phone-led Mac promotion flow:

- iPhone app exposes a **Mac Brain** setup screen.
- iPhone bootstrap server exposes `GET /setup/mac`.
- iPhone bootstrap server exposes `GET /setup/mac/manifest`.
- iPhone advertises `_ihomenerd-setup._tcp` with `role=mac-setup`.
- macOS installer can run with `IHN_MAC_LLM_BACKEND=mlx`.
- Python backend can route text `chat` / `generate` through an MLX-LM OpenAI-compatible sidecar.

This request joins the existing cross-testing pattern: Codex owns the feature branch, DeepSeek owns additive tests/results, and results should come back as dated Markdown artifacts.

---

## 2. Branch Handling

Please test the feature branch directly:

```bash
git fetch origin
git switch feature/iphone-mac-brain-setup || git switch -c feature/iphone-mac-brain-setup origin/feature/iphone-mac-brain-setup
git pull --ff-only
```

Do not merge `origin/wip/testing` into this feature branch. If you need the newest testing harness from `wip/testing`, use a disposable integration branch or cherry-pick only the specific test commits you need. The feature branch is the target under test.

---

## 3. Static / Unit Checks

Run the focused checks first:

```bash
cd backend
source .venv/bin/activate
python -m pytest tests/test_llm_provider.py -q
python -m ruff check app/llm.py tests/test_llm_provider.py
cd ..
python -m pytest mobile/testing/test_mlx_ios_static.py -q
bash -n install-ihomenerd-macos.sh
zsh -n install-ihomenerd-macos.sh
```

Expected:

- `test_llm_provider.py` passes.
- `mobile/testing/test_mlx_ios_static.py` passes if the iOS MLX catalog files are present.
- Shell syntax checks pass.
- Do not treat whole-repo Ruff failures as this branch's failure unless they touch the new provider files; the repo has pre-existing lint debt.

---

## 4. Backend MLX Provider Smoke With Fake Sidecar

This can run entirely on iMac-Debian without a real Mac or MLX runtime. It validates the Python backend routing seam.

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
    return {
        "id": "fake-mlx",
        "object": "chat.completion",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": "fake mlx response"},
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
IHN_PORT=17777 \
python -m app.main
```

Terminal C:

```bash
curl -sk https://127.0.0.1:17777/health | python -m json.tool
curl -sk https://127.0.0.1:17777/capabilities | python -m json.tool
curl -sk -X POST https://127.0.0.1:17777/v1/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Say hello in three words."}]}' \
  | python -m json.tool
```

Expected:

- `/health` has `llm.provider == "mlx"` and `llm.backend == "mlx_macos"`.
- `/health.providers` includes `mlx_macos`.
- `/capabilities` advertises `chat` as available with `backend == "mlx_macos"` and `endpoint == "/v1/chat"`.
- `/v1/chat` returns `{"response": "fake mlx response"}`.
- `ollama` may be false in this mode. That is acceptable for text chat. Embeddings and vision are still Ollama-backed in this first pass.

---

## 5. iPhone Mac Setup Route Smoke

Run only if Alex has installed the branch build on the iPhone and the phone is reachable on LAN.

On iPhone:

1. Open iHN Home built from `feature/iphone-mac-brain-setup`.
2. Open the **Mac** tab.
3. Start hosting if it is not already running.
4. Keep the app foregrounded and screen unlocked.

On iMac-Debian:

```bash
export IHN_IPHONE=http://<iphone-lan-ip>:17778
curl -s "$IHN_IPHONE/setup/mac" | head -40
curl -s "$IHN_IPHONE/setup/mac/manifest" | python3 -m json.tool
curl -s "$IHN_IPHONE/" | head -40
```

If Avahi is available:

```bash
avahi-browse -rt _ihomenerd-setup._tcp
```

Expected manifest assertions:

- `setupRole == "iphone_concierge"`
- `status == "installer_pending"`
- `mac.recommendedBackend == "mlx_macos"`
- `mac.requiredArchitecture == "arm64"`
- `pairing.requiresUserApproval == true`
- `pairing.oneTimeToken == false`
- `pairing.caKeyHandoff == false`
- `pairing.csrSigning == false`
- `homeCa.certUrl` is present.
- No Home CA private key URL or key material is exposed.

Expected page assertions:

- Page explains the App Store iPhone app as the trusted concierge.
- Page says production Mac install still needs Mac App Store or Developer ID signed/notarized software.
- Page includes the developer-preview `IHN_MAC_LLM_BACKEND=mlx` command.

---

## 6. Optional Real MLX Sidecar Smoke

If a Mac mini M1 is available and you are explicitly using it as the target machine, run the backend with a real `mlx_lm.server` instead of the fake sidecar:

```bash
cd backend
source .venv/bin/activate
pip install mlx-lm
python -m mlx_lm.server \
  --host 127.0.0.1 \
  --port 11435 \
  --model mlx-community/gemma-4-e2b-it-4bit
```

Then repeat §4 Terminal B and Terminal C.

Capture first-token latency if easy, but do not block the pass on performance. This request is primarily about routing correctness.

---

## 7. Regression Sweep

Against any running backend from this branch:

```bash
cd backend
source .venv/bin/activate
IHN_BASE_URL=https://127.0.0.1:17777 python -m pytest tests/test_contract_api.py -q
```

If this is run against the iPhone node:

```bash
IHN_BASE_URL=https://<iphone-lan-ip>:17777 \
IHN_BOOTSTRAP_URL=http://<iphone-lan-ip>:17778 \
python -m pytest tests/test_contract_api.py tests/test_chat_contract.py -q
```

Expected:

- Existing contract tests do not regress for the target node.
- Chat tests should keep respecting platform shape differences.
- If iPhone is offline, record that as blocked, not failed.

---

## 8. Capture Back

Please write one results doc:

```text
mobile/testing/results/IPHONE_TO_MAC_BRAIN_SETUP_AND_MLX_PROVIDER_RESULTS_2026-05-02.md
```

Include:

1. Branch and commit tested.
2. Which host ran each section.
3. Static/unit check results.
4. Fake MLX sidecar `/health`, `/capabilities`, and `/v1/chat` summaries.
5. iPhone `/setup/mac` and manifest results, if reachable.
6. Avahi/mDNS result for `_ihomenerd-setup._tcp`, if available.
7. Any contract regressions.
8. Verdict: `pass`, `partial`, or `blocked`.
9. Next action recommendation.

---

## 9. Pass / Fail Rule

Pass if:

- Static/unit checks pass.
- Fake MLX sidecar proves the Python backend routes text chat through `mlx_macos`.
- No Home CA private key material is exposed by the iPhone setup page or manifest.

Partial if:

- Backend provider routing passes but iPhone live route testing is blocked by device availability.

Fail if:

- `IHN_LLM_PROVIDER=mlx` still routes chat to Ollama.
- `/health` or `/capabilities` cannot report the active MLX backend.
- `/setup/mac/manifest` exposes CA private key material or claims `caKeyHandoff` / `csrSigning` is true before approval flow exists.

---

## 10. Hands-Off Zones

Please keep this pass test-focused. Additive tests and results are welcome; avoid editing runtime files unless a tiny testability shim is unavoidable.

Do not edit without checking back:

- `mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift`
- `mobile/ios/ihn-home/IhnHome/Screens/MacSetupScreen.swift`
- `backend/app/llm.py`
- `install-ihomenerd-macos.sh`
