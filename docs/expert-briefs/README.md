# Expert Briefs

This folder holds short, execution-oriented briefs for external coding,
review, and testing agents.

The point is not only to describe work. The point is to show a repeatable
pattern:

1. name the host
2. name the repo branch
3. name the merge target
4. name the validation path
5. provide a paste-ready kickoff prompt
6. require a follow-on testing request

Agents handle examples better than abstract policy. Use the sprint packs under
`reference/` as the stable reference shape for future work, then place live
work under the owning initiative in `initiatives/`.

## Folder Shape

```text
docs/expert-briefs/
  README.md
  INDEX.md
  reference/
  initiatives/
    <initiative>/
      README.md
      INDEX.md
      active/
      completed/
      paused/
      aborted/
```

Use **initiative-first grouping**. Platform is metadata, not the folder
hierarchy. A sprint that touches iOS, Android, frontend, and backend belongs
under the initiative whose success condition it advances.

`reference/` is for durable learning examples. It should grow slowly when a
sprint teaches a reusable pattern. `initiatives/` is for real product work.

## Sprint Pack Shape

Each active sprint should include:

```text
00-opencode-kickoff.md
01-brief.md
02-result-template.md
03-merge-note-template.md
```

`00-opencode-kickoff.md` is the paste-ready starting prompt. Version it with
the sprint so the team can improve the actual agent handoff over time instead
of reconstructing prompts from chat history.

The kickoff prompt should include:

- host and repo context
- dirty-worktree check before branch switching
- exact branch creation command
- required files to read first
- implementation fence
- explicit non-goals
- required tests, result note, commit, and push expectations

## Required execution fence

Every expert brief should state:

- repo
- implementation host
- base branch
- working branch
- merge target
- build/deploy host
- validation owner / host

Suggested block:

```md
## Execution Fence

- Repo: `iHomeNerd`
- Implementation host: `Acer-HL`
- Base branch: `origin/main`
- Working branch: `feature/<initiative>/<sprint-slug>`
- Merge target: `main`
- Build/deploy host: `iMac-macOS`
- Validation host: `iMac-Debian` / `wip/testing`
```

## Branch Naming

Use initiative-scoped branch names so branch lists group naturally across
OpenCode, Codex, GitHub, and local shells:

- `feature/<initiative>/<sprint-slug>` for product/code sprints
- `docs/<initiative>/<topic>` for coordination or architecture-only changes
- `validation/<initiative>/<sprint-slug>` for evidence-only validation work
- `fix/<initiative>/<short-bug>` for small corrective branches
- `wip/<host>/<topic>` only for local scratch branches that should not be
  reviewed as product work

Examples:

```text
feature/iphone-to-mac-brain/mlx-chat-contract-cleanup
feature/uniform-web-ui/android-web-serving
validation/iphone-to-mac-brain/ios-mac-setup-route-smoke
docs/expert-briefs/initiative-structure
```

## Reviewer-first rule

Expert briefs are not assignments. The useful framing is:

1. ask for judgment on the approach
2. define a tight implementation fence if the expert agrees
3. treat pushback as a valid deliverable when the approach is flawed

This grew out of the uniform-web-ui architecture work and the Android reference
sprints. It keeps agents from blindly executing a bad plan while still giving
them a bounded path when the plan is sound.

## Branch base rule

New feature sprint branches must be cut from `origin/main` at handoff time.

Temporary exception: if the sprint pack itself lives on an unmerged coordination
branch, the kickoff prompt may base from that branch until the pack lands on
`main`. The brief must call that out explicitly.

Do not start a new feature sprint from:

- a stale local bootstrap branch
- a machine branch carrying unrelated work
- an older feature branch unless the dependency is explicit

This matters because even a good agent can be made to fail by a bad branch base.
The third Android sprint exposed this clearly.

## Host role rule

Keep these roles distinct in the brief:

- **Implementation host**: where the coding agent works
- **Build/deploy host**: where platform-native builds and installs happen
- **Validation host**: where the testing lane records evidence

For the Android reference flow:

- `Acer-HL` = coding host
- `iMac-macOS` = Android build/deploy host
- `iMac-Debian` = testing/evidence host

The build/deploy host is not automatically the testing lane.

## Smoke-before-testing rule

Coding work is not ready for the testing lane just because the diff looks good.

Before handing off to testing, the coding owner should get to a **smoke-ready**
state:

1. branch builds
2. deploy path works on the proper build host
3. app installs
4. app launches
5. the changed surface responds honestly
6. no obvious regression appears on the touched runtime path

Only after that should the formal validation request move to `wip/testing`.

## Required Deliverables

Every coding expert effort should end with:

1. code and doc changes on the named branch
2. a short result note
3. a concrete testing request for the next validator, using the same sprint slug

That last item matters. Do not stop at "implementation done." Leave the next
tester a runnable request.

If the sprint cannot reach smoke-ready state, the result note should say so
explicitly and leave the exact blocker and next commands.

## Testing Mirror

Testing artifacts should mirror the initiative and sprint slug without
duplicating the whole brief pack:

```text
testing/initiatives/<initiative>/<sprint-slug>/
  request.md
  result.md
  evidence/
```

Legacy mobile-focused requests may still live under `mobile/testing/` until
they are migrated. New initiative work should prefer `testing/initiatives/`.

## Current References

- `reference/2026-05-02_android-server-profile-surface/`
- `reference/2026-05-02_android-model-catalog/`
- `reference/2026-05-02_android-uniform-web-serving/`
