# OpenCode Kickoff - Mac Launchd Sidecar Service

You are implementing the next sprint in the `iphone-to-mac-brain` initiative.

## Read First

1. `docs/expert-briefs/initiatives/iphone-to-mac-brain/README.md`
2. `docs/expert-briefs/initiatives/iphone-to-mac-brain/LESSONS.md`
3. `docs/expert-briefs/initiatives/iphone-to-mac-brain/MAC_MLX_MODEL_LADDER.md`
4. `docs/expert-briefs/initiatives/iphone-to-mac-brain/active/2026-05-04_mac-launchd-sidecar-service/01-brief.md`
5. `testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-launchd-sidecar-service/request.md`

## Branch

Start from current `origin/main` and create:

```bash
feature/iphone-to-mac-brain/mac-launchd-sidecar-service
```

Do not work on `main`.

## Task

Harden the macOS installer so the MLX sidecar is a launchd-managed user service
with test-safe labels and ports.

Primary file:

```text
install-ihomenerd-macos.sh
```

Expected behavior:

- keep `mlx-community/Qwen2.5-1.5B-Instruct-4bit` as the default model
- keep `mlx-lm==0.31.3` as the pinned default runtime
- keep the sidecar venv separate from `backend/.venv`
- make `run-mlx.sh` use a non-deprecated MLX server invocation
- add `IHN_PORT` support to the generated backend runtime
- add `IHN_SERVICE_LABEL_SUFFIX` support for launchd labels, plist filenames,
  log filenames, and printed operator commands
- add `IHN_SKIP_OLLAMA=1` support so MLX smoke installs do not register or
  start Ollama
- keep the MLX sidecar bound to `127.0.0.1`

Smoke validation must be able to run with:

```bash
IHN_INSTALL_DIR="$HOME/.ihomenerd-smoke/mac-launchd-sidecar-service" \
IHN_SERVICE_LABEL_SUFFIX=.smoke \
IHN_PORT=18777 \
IHN_MLX_SERVER_PORT=12435 \
IHN_MAC_LLM_BACKEND=mlx \
IHN_SKIP_OLLAMA=1 \
IHN_AUTO_YES=1 \
IHN_SKIP_OPEN=1 \
bash install-ihomenerd-macos.sh
```

Do not change the default model to a larger candidate from the model ladder.
Those are future benchmark/profile sprints.

## Validation Expectations

Before handoff, run what you can locally:

- `bash -n install-ihomenerd-macos.sh`
- inspect generated script/plist content if you add helper modes or fixture
  generation
- update `testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-launchd-sidecar-service/request.md`
  if your implementation reveals additional failure cases validators should
  check

If Acer-HL cannot run macOS launchd, do not fake a PASS. Fill the result with
local evidence and mark mac-mini validation as required.

## Result

Fill:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-launchd-sidecar-service/result.md
```

Include:

- branch
- commit SHA
- changed files
- local checks run
- whether the branch was pushed
- any validation-specific notes for iMac-Debian and mac-mini
