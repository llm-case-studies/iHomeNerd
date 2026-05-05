# OpenCode Kickoff - Mac MLX Runtime Preflight

Paste this into the OpenCode session on `Acer-HL` after the current
`uniform-web-ui` work is finished.

```text
You are implementing the next iHomeNerd iPhone-to-Mac Brain sprint.

Repo: iHomeNerd
Implementation host: Acer-HL
Build/runtime host for validation: mac-mini
Validation host: iMac-Debian
Sprint:
docs/expert-briefs/initiatives/iphone-to-mac-brain/active/2026-05-04_mac-mlx-runtime-preflight/01-brief.md

Start with safety:

git status --short --branch

If there are uncommitted changes, stop and report them. Do not stash, commit,
or discard anything unless Alex explicitly approves.

Then create the sprint branch:

git fetch origin
git switch -c feature/iphone-to-mac-brain/mac-mlx-runtime-preflight origin/main

If the branch already exists locally, switch to it and report current status
before editing.

Read first:
- docs/expert-briefs/README.md
- docs/expert-briefs/initiatives/iphone-to-mac-brain/README.md
- docs/expert-briefs/initiatives/iphone-to-mac-brain/LESSONS.md
- docs/expert-briefs/initiatives/iphone-to-mac-brain/active/2026-05-04_mac-mlx-runtime-preflight/01-brief.md
- testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-mlx-runtime-preflight/request.md
- testing/initiatives/iphone-to-mac-brain/2026-05-03_mac-mini-mlx-sidecar-smoke/result.md

Your fence:
- install-ihomenerd-macos.sh
- docs/APPLE_SILICON_NATIVE_MLX_HOSTING_2026-05-01.md, only if command examples need adjustment
- docs/IPHONE_TO_MAC_BRAIN_SETUP_VISION_2026-05-01.md, only if installer env examples need adjustment
- testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-mlx-runtime-preflight/result.md
- testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-mlx-runtime-preflight/request.md, only if implementation reveals extra validation cases

Do not edit iOS, frontend, pairing/certificate flows, unrelated backend APIs,
or uniform-web-ui files.

Goal:
Make the macOS installer repeat the validated manual MLX setup:
- default MLX model: mlx-community/Qwen2.5-1.5B-Instruct-4bit
- pinned MLX package: mlx-lm==0.31.3 by default
- dedicated sidecar venv: ${INSTALL_DIR}/runtime/mlx-sidecar-venv by default
- backend venv stays separate and should not receive mlx-lm
- known-bad Gemma 4 model should fail fast unless explicitly overridden
- add safe modes:
  - IHN_PREFLIGHT_ONLY=1: checks and prints plan, then exits before download,
    CA, venv install, launchd, or service start
  - IHN_MLX_RUNTIME_ONLY=1: creates/updates only the MLX sidecar runtime venv,
    verifies mlx_lm.server, then exits before repo download, CA, backend venv,
    launchd, or service start

Keep launchd redesign out of scope. If existing run-mlx.sh is touched, only make
it use the dedicated sidecar venv and pinned model/version correctly.

Before handoff:
1. Run bash -n install-ihomenerd-macos.sh.
2. Run any focused local shell/unit checks you add.
3. Fill testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-mlx-runtime-preflight/result.md.
4. If you find additional validation risk, add it to request.md.
5. Commit and push feature/iphone-to-mac-brain/mac-mlx-runtime-preflight.
```
