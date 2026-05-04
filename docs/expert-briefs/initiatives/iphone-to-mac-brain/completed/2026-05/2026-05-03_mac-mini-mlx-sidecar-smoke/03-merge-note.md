# Merge Note - Mac Mini MLX Sidecar Smoke

## Branch

- validation branch: `validation/iphone-to-mac-brain/mac-mini-mlx-sidecar-smoke`
- merge target: `main`
- tested product commit: `7f84a8d`

## Validation Outcome

- validation host: `iMac-Debian`
- runtime host: `mac-mini`
- sidecar model: `mlx-community/Qwen2.5-1.5B-Instruct-4bit`
- validation branch commit: `765121f`
- evidence merge commit: `894438c`
- verdict: PASS with findings
- result path:
  `testing/initiatives/iphone-to-mac-brain/2026-05-03_mac-mini-mlx-sidecar-smoke/result.md`

## Evidence Summary

- mac-mini preflight: Apple Silicon M1, macOS 26.4.1, backend Python 3.12.13
- real MLX sidecar: `mlx-lm==0.31.3` in a dedicated sidecar venv
- iHN backend with `IHN_LLM_PROVIDER=mlx`: `/health` and `/capabilities` report
  `provider=mlx`, `backend=mlx_macos`
- prompt chat: HTTP 200 with canonical fields
- messages chat: HTTP 200 with canonical fields
- no-sidecar 502: clean JSON `detail`
- finding: `mlx-community/gemma-4-e2b-it-4bit` crashes generation under
  `mlx-lm==0.31.3`; Qwen2.5 1.5B is the validated default

## Decision

- merge evidence to `main`: yes
- close sprint: yes
- fix default model on `main`: yes, replace Gemma 4 with Qwen2.5 1.5B for the
  Mac MLX sidecar default and recommendation docs

## Follow-Up

- next sprint: mac installer/preflight hardening can now assume a validated
  sidecar model and should install/start MLX in a dedicated sidecar venv.
