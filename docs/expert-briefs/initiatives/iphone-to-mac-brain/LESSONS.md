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

## 2026-05-03 — iOS Mac Setup Route Smoke

Sprint:

- `2026-05-03_ios-mac-setup-route-smoke`
- Branch: `validation/iphone-to-mac-brain/ios-mac-setup-route-smoke`
- Validation host: `iMac-Debian`
- Build/deploy host: `mac-mini`
- Target device: iPhone 12 Pro Max

Lessons:

- **The multi-machine lane works.** `iMac-Debian` can drive the Mac build host
  over SSH, `mac-mini` can build/deploy through Xcode to the real iPhone, and
  the validator can probe the iPhone over the LAN.
- **Keychain secrets stay out of agent chat.** `IHN_KEYCHAIN_PW` is the
  mac-mini `alex` login/keychain password and should be typed into the shell
  with `read -rs`, not pasted into an agent session.
- **Personal Team trust is a known real-device step.** First launch can be
  blocked by "Untrusted Developer" until the developer profile is trusted under
  Settings > General > VPN & Device Management.
- **Real-device smoke should record both build lane and route lane.** The result
  needs the SSH/build/deploy outcome, the device identity/IP, and the actual
  route/security probes.
- **Bonjour is useful evidence.** `_ihomenerd-setup._tcp` with `role=mac-setup`
  proved the setup service was visible on the LAN, not only reachable by direct
  IP.

Follow-up:

- Consider documenting a preflight checklist for iOS validation sessions:
  iPhone unlocked, same Wi-Fi, Developer Mode enabled, trusted developer profile,
  and keychain password entered only through the shell.

## 2026-05-03 — Mac Mini MLX Sidecar Smoke

Sprint:

- `2026-05-03_mac-mini-mlx-sidecar-smoke`
- Branch: `validation/iphone-to-mac-brain/mac-mini-mlx-sidecar-smoke`
- Validation host: `iMac-Debian`
- Runtime host: `mac-mini`

Lessons:

- **`/v1/models` is not enough.** Gemma 4 listed successfully from
  `mlx_lm.server`, but generation crashed in the worker thread. Real sidecar
  validation must include POST chat probes.
- **Pin runtime and model together.** `mlx-lm==0.31.3` works with
  `mlx-community/Qwen2.5-1.5B-Instruct-4bit` on the Mac mini, but not with the
  previously configured Gemma 4 default.
- **Keep sidecar dependencies isolated.** Installing `mlx-lm` into a dedicated
  `~/.ihomenerd/runtime/mlx-sidecar-venv` kept the backend venv stable and made
  the runtime boundary explicit.
- **Record first-run model cost.** Qwen2.5 1.5B downloaded and loaded quickly
  enough for a starter model; Gemma 4 was larger and still failed after
  download.

Follow-up:

- Mac installer/preflight should create or reuse the sidecar venv and default to
  `mlx-community/Qwen2.5-1.5B-Instruct-4bit`.

## 2026-05-04 — Mac MLX Runtime Preflight

Sprint:

- `2026-05-04_mac-mlx-runtime-preflight`
- Branch: `feature/iphone-to-mac-brain/mac-mlx-runtime-preflight`
- Implementation host: `Acer-HL`
- Validation host: `iMac-Debian`
- Runtime host: `mac-mini`

Lessons:

- **Safe installer modes are worth first-class treatment.** `IHN_PREFLIGHT_ONLY`
  and `IHN_MLX_RUNTIME_ONLY` let validators exercise the risky Mac runtime path
  without running the full installer, touching launchd, or mutating the backend
  venv.
- **Sidecar runtime belongs outside backend venv.** The installer now uses a
  dedicated `${INSTALL_DIR}/runtime/mlx-sidecar-venv`, matching the manually
  validated setup and avoiding dependency coupling between FastAPI and MLX.
- **Known-bad model guards should fail before side effects.** The Gemma 4 guard
  prevents repeating the validated `mlx-lm==0.31.3` incompatibility unless an
  explicit override is set.
- **Automation-safe means no prompts.** The disk-space confirmation still runs
  before preflight-only exits; automated callers should set `IHN_AUTO_YES=1`
  until that is tightened.
- **Runtime checks can age.** `python -m mlx_lm.server --help` still exits 0,
  but prints a deprecation warning. Future hardening should use the preferred
  CLI invocation.

Follow-up:

- Launchd service hardening should use the dedicated sidecar venv and should
  avoid deprecated `mlx_lm.server` invocation forms.
