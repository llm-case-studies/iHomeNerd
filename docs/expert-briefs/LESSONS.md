# Expert Briefs Lessons Log

Cross-initiative lessons that should improve future sprint packs, prompts, and
validation flow.

## 2026-05-03 — First OpenCode Sprint Under Initiative Structure

Context:

- Initiative: `iphone-to-mac-brain`
- Sprint: `2026-05-03_mlx-chat-contract-cleanup`
- Implementation host: `Acer-HL`
- Coordination host: `mac-mini`

Lessons:

- **Version the starting prompt.** A paste-ready `00-opencode-kickoff.md`
  prevents handoff drift and lets the team improve prompts from real outcomes.
- **Use initiative-scoped branches.** Branches like
  `feature/iphone-to-mac-brain/mlx-chat-contract-cleanup` group naturally in
  OpenCode, GitHub, and local shells.
- **Check branch drift first.** A kickoff prompt should require
  `git status --short --branch` before switching branches, especially when an
  OpenCode session still shows an older initiative.
- **Treat testing requests as a floor.** The initial `request.md` is a minimum
  validation contract. Coding agents should add cases when implementation work
  reveals new failure modes.
- **Define smoke by sprint risk.** Fake-dependency smoke is valid for backend
  contract work. Real-device smoke is required when the device, install path, or
  native runtime is the thing being changed.
- **Auth setup is part of host readiness.** Implementation hosts should have
  GitHub push access before sprint start, or the handoff will stall after good
  work is done.
- **Result notes need final branch truth.** After the last push, `result.md`
  should name the final branch tip, not an earlier implementation commit.

Follow-up:

- Promote sprint packs that teach new reusable patterns into `reference/` after
  validation closes.
- Add host readiness checks to future kickoff prompts when a new machine enters
  the flow.

## 2026-05-03 — Native Runtime Validation Must Exercise Generation

Context:

- Initiative: `iphone-to-mac-brain`
- Sprint: `2026-05-03_mac-mini-mlx-sidecar-smoke`
- Runtime host: `mac-mini`

Lessons:

- **Model listing is a weak readiness signal.** A sidecar can return
  `/v1/models` while the first generation request crashes or hangs. Runtime
  sprints should always include at least one POST generation probe.
- **Defaults need real-host evidence.** A model that appears in catalogs or SDK
  registries is not automatically a safe default for a specific runtime version.
- **Validation can produce product fixes.** Evidence sprints should be allowed
  to close with "PASS with findings" when the path works but a default, doc, or
  installer assumption needs immediate correction.
