# iPhone-to-Mac Brain Lessons Log

Lessons specific to the phone-first Apple Silicon Mac brain initiative.

## 2026-05-03 — MLX Chat Contract Cleanup

Sprint:

- `2026-05-03_mlx-chat-contract-cleanup`
- Branch: `feature/iphone-to-mac-brain/mlx-chat-contract-cleanup`
- Implementation host: `Acer-HL`

Lessons:

- **Backend contract smoke does not need the iPhone.** The `/v1/chat` cleanup
  was correctly proven with focused backend checks, local API probes, and a fake
  MLX sidecar. Asking for iPhone 12 Pro Max attach/build would have tested the
  wrong risk.
- **Fake sidecar smoke is valuable.** A fake OpenAI-compatible MLX endpoint
  proved both success shapes and no-sidecar 502 behavior without requiring the
  real Mac MLX runtime.
- **Provider-unavailable is a contract, not a crash.** For this API, unavailable
  Ollama/MLX should be JSON `502 detail`. Tests and validators should treat that
  as an expected provider-unavailable outcome when no model runtime is present.
- **Support both client shapes deliberately.** Python now accepts iOS-style
  `prompt` and legacy/message-style `messages`, but validates malformed
  `messages` before the request reaches the provider.
- **Smoke results can improve the test request.** The non-string
  `messages[].content` case emerged during implementation and was added to the
  existing validation request.
- **Merge coordination docs before handoff.** Product branches created from a
  sprint-pack branch should merge the latest coordination docs before validation
  so testers see the current smoke and testing-request rules.

Open questions:

- Whether Python should eventually support structured OpenAI-style content
  parts in `messages[].content`, or keep the current string-only contract.
- Whether provider-unavailable should remain `502` for all text providers, or
  split sidecar unreachable (`502`) from no model loaded (`503`) later.
