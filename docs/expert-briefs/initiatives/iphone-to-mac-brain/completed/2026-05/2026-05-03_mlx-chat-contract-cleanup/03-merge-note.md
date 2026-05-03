# Merge Note — MLX Chat Contract Cleanup

## Branch

- working branch: `feature/iphone-to-mac-brain/mlx-chat-contract-cleanup`
- merge target: `main`
- validation branch: `validation/iphone-to-mac-brain/mlx-chat-contract-cleanup`

## Validation Outcome

- implementation host: `Acer-HL`
- validation host: `iMac-Debian`
- tested product commit: `1b64086`
- validation evidence commit: `714e0d9`
- final validation branch tip after bookkeeping fix: `e31095b`
- verdict: PASS
- focused tests: `test_llm_provider.py` passed; HTTP integration suites require
  a running backend and are documented in evidence.
- fake-sidecar smoke: PASS for `/health`, `/v1/chat` with `prompt`,
  `/v1/chat` with `messages`, no-sidecar 502, invalid body 400, and
  non-string content 400.
- result path:
  `testing/initiatives/iphone-to-mac-brain/2026-05-03_mlx-chat-contract-cleanup/result.md`

## Contract Decision

- accepted request shapes: `{"prompt": "..."}` and
  `{"messages": [{"role": "user", "content": "..."}]}`
- returned response fields: `role`, `content`, `text`, `response`, `model`,
  `backend`, `provider`
- invalid input status: HTTP 400 JSON `detail`
- provider error status: HTTP 502 JSON `detail`

## Follow-Up

- next sprint: `2026-05-03_ios-mac-setup-route-smoke` for the iPhone build
  lane, or `2026-05-03_mac-mini-mlx-sidecar-smoke` for the real Mac MLX
  runtime lane.
