# Result - Mac MLX Runtime Preflight

**Date:** 2026-05-04
**Initiative:** `iphone-to-mac-brain`
**Sprint:** `2026-05-04_mac-mlx-runtime-preflight`
**Implementation host:** `Acer-HL`
**Base branch:** `origin/main` (`8ab67ac`)
**Working branch:** `feature/iphone-to-mac-brain/mac-mlx-runtime-preflight`
**Validation branch:** `validation/iphone-to-mac-brain/mac-mlx-runtime-preflight`
**Validation host:** `iMac-Debian`
**Runtime host:** `mac-mini` (Apple M1, macOS 26.4.1)
**Tested product commit:** `6f1b55a`
**Verdict:** PASS (with findings)

## Summary

All safe-mode installer behaviors work correctly on Apple Silicon. The
preflight-only and runtime-only modes each produce the expected side effects
(or lack thereof), and the Gemma 4 guard/override logic functions as designed.
Two findings are worth noting.

## Probe Results

| # | Probe | Expected | Actual | Pass |
|---|-------|----------|--------|------|
| 1 | Syntax check | No output | `SYNTAX OK` | PASS |
| 2 | Preflight-only | Exit 0, no side effects, prints config summary | Exit 0, summary printed, no side effects | PASS |
| 3 | Runtime-only | Creates MLX venv, installs mlx-lm==0.31.3, verifies --help, no backend/.venv, no launchd | All conditions met | PASS |
| 4 | mlx_lm.server --help | Help output from sidecar venv | Full help text printed (deprecation notice present) | PASS |
| 5 | Gemma 4 guard | Non-zero exit, clear error msg | Exit 1, "known incompatible with mlx-lm==0.31.3", override instructions shown | PASS |
| 6 | Gemma 4 override | Warns then proceeds, exit 0 | Warning printed, preflight passed, exit 0 | PASS |
| 7 | Launchd untouched | No com.ihomenerd.* plists before or after | NONE both pre and post | PASS |

### Probe Details

**Probe 1 - Syntax:**
`bash -n install-ihomenerd-macos.sh` → no output, exit 0.

**Probe 2 - Preflight-only:**
```
Install directory:      /Users/alex/.ihomenerd
Backend:                mlx
MLX model:              mlx-community/Qwen2.5-1.5B-Instruct-4bit
mlx-lm version:         0.31.3
MLX sidecar venv:       /Users/alex/.ihomenerd/runtime/mlx-sidecar-venv
MLX server port:        11435
Backend venv:           /Users/alex/.ihomenerd/backend/.venv
```
No downloads, CA creation, venv installs, launchd registration, or service
starts were performed.

**Probe 3 - Runtime-only:**
Created `/tmp/ihn-mlx-runtime-test-*/runtime/mlx-sidecar-venv`, installed
`mlx-lm==0.31.3` and all dependencies (including `mlx==0.31.2` and
`mlx-metal==0.31.2`), verified `mlx_lm.server --help` returns 0. No
`backend/.venv` created, no launchd plists written.

**Probe 4 - Sidecar CLI help:**
`mlx_lm.server --help` prints full help text with all options (`--model`,
`--host`, `--port`, `--temp`, `--max-tokens`, etc.). A deprecation notice
appears: "Calling `python -m mlx_lm.server...` directly is deprecated. Use
`mlx_lm.server...` or `python -m mlx_lm server ...` instead." The
`--help` exit code is still 0, so the current check works.

**Probe 5 - Gemma 4 guard:**
```
✘ mlx-community/gemma-4-e2b-it-4bit is known incompatible with
  mlx-lm==0.31.3. Set IHN_MLX_MODEL to a validated model
  (mlx-community/Qwen2.5-1.5B-Instruct-4bit) or
  IHN_ALLOW_UNVALIDATED_MLX_MODEL=1 to override.
```
Exit code 1. Blocks before preflight summary.

**Probe 6 - Gemma 4 override:**
```
⚠️ Overriding known-bad model guard for mlx-community/gemma-4-e2b-it-4bit.
   This model is known incompatible with mlx-lm==0.31.3.
```
Preflight proceeds with the warning, exit code 0.

## Findings

### Finding 1: Preflight disk check is not behind `IHN_PREFLIGHT_ONLY=1`

The disk availability check (`df -g "$HOME"`) and interactive
`confirm_or_exit` prompt run before the `IHN_PREFLIGHT_ONLY=1` early
exit (line ~247 of the script). If disk is below 12GB, the preflight
prompts the user unless `IHN_AUTO_YES=1` is also set. This means
`IHN_PREFLIGHT_ONLY=1` alone is **not fully automation-safe** when disk
space is tight.

**Impact:** CI or automated preflight runners must also set
`IHN_AUTO_YES=1` to guarantee non-interactive execution.

**Severity:** Low. Disk thresholds are rarely triggered on developer Macs,
and `IHN_AUTO_YES=1` is the documented escape hatch.

### Finding 2: `mlx_lm.server --help` emits deprecation notice

The current verification check in the runtime-only mode runs
`python -m mlx_lm.server --help`. As of `mlx-lm==0.31.3`, this form is
deprecated in favor of `mlx_lm.server --help` or `python -m mlx_lm server --help`.
The check still passes (exit 0) because `--help` works, but the installer
prints a deprecation warning on stderr.

**Impact:** Cosmetic. The `--help` exit code is 0. The deprecation notice
will be printed during install but does not block the setup.

**Follow-up:** Update the `--help` check in the installer to use
`mlx_lm.server --help` instead of `python -m mlx_lm.server --help` when
the deprecation becomes a hard error in a future mlx-lm release.

## Evidence Index

```
evidence/
  01_bash_syntax.txt          - Syntax check result (SYNTAX OK)
  02_preflight_only.txt       - Preflight-only mode output
  03_runtime_only.txt         - Runtime-only mode output + post-checks
  04_mlx_server_help.txt      - mlx_lm.server --help output from sidecar venv
  05_gemma4_guard.txt         - Gemma 4 guard rejection
  06_gemma4_override.txt      - Gemma 4 override warning + preflight pass
  07_launchd_untouched.txt    - Launchd pre/post verification
```

## Blockers

None. All six probes pass. Both findings are low-severity and do not block
the feature branch from merging.
