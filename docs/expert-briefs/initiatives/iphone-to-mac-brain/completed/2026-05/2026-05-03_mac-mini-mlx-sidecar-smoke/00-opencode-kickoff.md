# OpenCode Kickoff - Mac Mini MLX Sidecar Smoke

Paste this into the OpenCode session on `iMac-Debian`.

```text
You are validating the iHomeNerd iPhone-to-Mac Brain initiative.

Repo: iHomeNerd
Validation host: iMac-Debian
Runtime/build host: mac-mini
Sprint:
docs/expert-briefs/initiatives/iphone-to-mac-brain/active/2026-05-03_mac-mini-mlx-sidecar-smoke/01-brief.md

Start with safety:

git status --short --branch

If there are uncommitted changes, stop and report them. Do not stash, commit,
or discard anything unless Alex explicitly approves.

Then create the validation branch:

git fetch origin
git switch -c validation/iphone-to-mac-brain/mac-mini-mlx-sidecar-smoke origin/main

If the branch already exists locally, switch to it and report current status
before writing evidence.

Read first:
- docs/expert-briefs/README.md
- docs/expert-briefs/initiatives/iphone-to-mac-brain/README.md
- docs/expert-briefs/initiatives/iphone-to-mac-brain/active/2026-05-03_mac-mini-mlx-sidecar-smoke/01-brief.md
- testing/initiatives/iphone-to-mac-brain/2026-05-03_mac-mini-mlx-sidecar-smoke/request.md

Your fence:
- testing/initiatives/iphone-to-mac-brain/2026-05-03_mac-mini-mlx-sidecar-smoke/result.md
- testing/initiatives/iphone-to-mac-brain/2026-05-03_mac-mini-mlx-sidecar-smoke/evidence/
- docs/expert-briefs/initiatives/iphone-to-mac-brain/active/2026-05-03_mac-mini-mlx-sidecar-smoke/02-result-template.md only if the template itself is wrong
- docs/expert-briefs/initiatives/iphone-to-mac-brain/active/2026-05-03_mac-mini-mlx-sidecar-smoke/03-merge-note-template.md only if the template itself is wrong

Do not edit backend, iOS, installer, frontend, or unrelated docs during this
validation sprint unless you find a tiny documentation defect that directly
blocks the evidence. If product code is broken, record the defect and stop.

Goal:
Use iMac-Debian to drive mac-mini over SSH and prove whether real
`mlx_lm.server` can serve `POST /v1/chat` through iHN's Python backend with
`IHN_LLM_PROVIDER=mlx`.

Important:
- This is not the fake sidecar smoke. Use a real MLX runtime on mac-mini.
- If the real MLX CLI, backend Python >=3.11 venv, or the model is missing,
  record the exact blocker and do not install anything unless Alex explicitly
  approves. Do not block only because macOS system `python3` is old if the
  backend venv and `mlx_lm.server` are usable.
- If the model has to download, record model name, approximate download size if
  shown, and elapsed time.
- Treat the testing request as the minimum validation floor. If you notice
  another likely failure mode, add the probe to the result or request before
  committing.

Before handoff:
1. Run the preflight checks in the testing request.
2. If prerequisites are present, start the real MLX sidecar on mac-mini.
3. Start iHN backend on mac-mini with `IHN_LLM_PROVIDER=mlx`.
4. Capture `/v1/models`, `/health`, `/capabilities`, `/v1/chat` prompt,
   `/v1/chat` messages, and no-sidecar 502 evidence.
5. Fill result.md.
6. Commit the validation result and evidence on the validation branch.
7. Push the branch.
```
