# Test Request — iOS Chat Contract Unification

**Date issued:** 2026-05-03
**Initiative:** `uniform-web-ui`
**Sprint:** `2026-05-03_ios-chat-contract-unification`
**Target branch:** `feature/uniform-web-ui/ios-chat-contract-unification`
**Validator host:** `iMac-Debian` / `wip/testing`
**Target device:** iPhone 12 PM (`192.168.0.220:17777`) — Hosting toggle on; simulator acceptable as fallback

## What You Are Validating

That iOS `POST /v1/chat` now matches the unified contract shipped on the backend (`4e9aa7b`):

1. accepts both `{"prompt": "..."}` (legacy) and `{"messages": [...]}` (canonical) request shapes
2. returns the canonical response superset: `role`, `content`, `text`, `response`, `model`, `backend`, `provider`, plus iOS-specific `processingTime` and `tokensPerSecond`
3. honest 400 / 502 / 503 errors

## Prerequisites

- iPhone 12 PM running the build from `feature/uniform-web-ui/ios-chat-contract-unification` (simulator with the build also acceptable)
- Hosting toggle on; an MLX model loaded via the Models tab (Qwen 2.5 1.5B or Gemma 4 E2B)
- LAN reachable: `curl -sk https://192.168.0.220:17777/health` returns OK

## Probe Sequence

```bash
export IHN_IOS=https://192.168.0.220:17777
mkdir -p evidence

# 1. legacy {prompt} shape — should still work
curl -sk -X POST "$IHN_IOS/v1/chat" \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Say hello in one word."}' \
  | tee evidence/01_prompt_shape.json

# 2. canonical {messages} shape — must work after this sprint
curl -sk -X POST "$IHN_IOS/v1/chat" \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Say hello in one word."}]}' \
  | tee evidence/02_messages_shape.json

# 3. response shape verification — both responses must include all canonical fields
for f in evidence/01_prompt_shape.json evidence/02_messages_shape.json; do
  echo "=== $f ==="
  python3 -c "import json,sys; r=json.load(open('$f')); \
    print({k: (k in r) for k in ['role','content','text','response','model','backend','provider','processingTime','tokensPerSecond']})"
done

# 4. error paths
curl -sk -w '\nHTTP %{http_code}\n' -X POST "$IHN_IOS/v1/chat" \
  -H 'Content-Type: application/json' -d '{}' | tee evidence/03_empty_body.txt
curl -sk -w '\nHTTP %{http_code}\n' -X POST "$IHN_IOS/v1/chat" \
  -H 'Content-Type: application/json' -d '{"messages":[]}' | tee evidence/04_empty_messages.txt
curl -sk -w '\nHTTP %{http_code}\n' -X POST "$IHN_IOS/v1/chat" \
  -H 'Content-Type: application/json' -d '{"prompt":""}' | tee evidence/05_empty_prompt.txt
```

## Pass Criteria

- Probe 1 (legacy `{prompt}`) returns 200 with the canonical response superset.
- Probe 2 (canonical `{messages}`) returns 200 with the same shape.
- Probe 3 reports `True` for **all** of: `role`, `content`, `text`, `response`, `model`, `backend`, `provider` in both responses.
- Probe 4 returns 400 with a JSON `detail` body for all three invalid-input cases.
- Existing `/capabilities`, `/system/stats`, `/v1/models`, `/setup/trust-status` continue to respond normally (regression check below).

## Regression Checklist (must remain green)

```bash
curl -sk "$IHN_IOS/capabilities" | python3 -m json.tool > evidence/10_capabilities.json
curl -sk "$IHN_IOS/system/stats" | python3 -m json.tool > evidence/11_system_stats.json
curl -sk "$IHN_IOS/v1/models" | python3 -m json.tool > evidence/12_models.json
curl -sk "http://192.168.0.220:17778/setup/trust-status" | python3 -m json.tool > evidence/13_trust.json
```

## Fail Criteria

- Either request shape returns non-200 on a valid input.
- Any canonical field missing from the response.
- Error case returns 500 / unhandled exception instead of 400 with JSON detail.
- Native ChatScreen on the iPhone breaks (open the app's Chat tab, send a prompt — it should still work as before).

## What To Record In `result.md`

- Final branch tip SHA
- Output of all probes captured in `evidence/`
- One-line verdict: PASS / FAIL / PARTIAL with reasoning
- Any iOS-side surprise found during validation (worth promoting to a follow-up sprint)

## Next-Step Hints If Validation Fails

- 400 on canonical `{messages}` shape → input parsing branch was missed; check `handleChat` early-exit condition
- Missing `provider` field → response builder didn't include it; backend uses `provider: "mlx"`, iOS should use `"mlx_ios"` to match `backend`
- Native ChatScreen broke → MLXEngine.generate signature was changed; revert and treat the prompt-extraction logic as HTTP-side only
