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

## 2026-05-06 — Cross-Repo Client Validation Needs Real Homes

Context:

- Initiative: `uniform-web-ui`
- iHomeNerd sprint:
  `feature/uniform-web-ui/speech-extraction-plugin-namespace`
- Paired client sprint:
  `PronunCo` `feature/local-companion-plugin-namespace-adoption`
- Validation host: `iMac-Debian`

Lessons:

- **Client repos need their own evidence lanes.** The `feature/...` vs
  `validation/...` split worked well in practice. Product branches should hold
  implementation only; paired rollout notes and evidence should land on the
  client repo's `validation/<initiative>/<sprint>` branch.
- **Pre-seed client repos on the validation host.** The first validator stalled
  because `PronunCo` was not checked out on `iMac-Debian`. Cross-repo prompts
  should not assume a client repo exists; host preparation must create a real
  validation checkout first.
- **Pre-seed the dependency harness too.** A repo checkout alone is not enough
  for client validation. UI test dependencies and any runtime harness needed for
  live probes should be installed or copied before handing the sprint to a
  validator.
- **Keep paired old/new platform worktrees available.** Having
  `iHomeNerd` old-contract and new-contract worktrees side by side on the
  validation host made dual-stack client verification much cleaner than
  repeatedly switching one checkout.
- **Distinguish workflow validation from stronger runtime validation.** A
  second reviewer who confirms branch usage, test flow, and source-level
  contract alignment is useful, but it does not replace earlier live backend
  probing. Result notes should say clearly which one happened.
- **Preserve merge order in the docs.** For contract migrations, the validation
  result should restate the expected merge order explicitly:
  `client feature -> platform feature -> cleanup sprint`.

Follow-up:

- Add host-readiness notes to future client validation kickoff prompts:
  repo path, branch, dependency state, and any paired platform worktrees.
- Treat the first successful client validation host setup as reusable
  infrastructure, not as one-off sprint glue.
