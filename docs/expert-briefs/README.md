# Expert Briefs

This folder holds short, execution-oriented briefs for external coding and
testing agents.

The point is not only to describe work. The point is to show a repeatable
pattern:

1. name the host
2. name the repo branch
3. name the merge target
4. name the validation path
5. require a follow-on testing request

Agents handle examples better than abstract policy. Use the example sprint pack
under `examples/` as the reference shape for future work.

## Required execution fence

Every expert brief should state:

- repo
- host
- base branch
- working branch
- merge target
- validation owner / host

Suggested block:

```md
## Execution Fence

- Repo: `iHomeNerd`
- Host: `Acer-HL`
- Base branch: `origin/main`
- Working branch: `feature/<topic>`
- Merge target: `main`
- Validation host: `iMac-macOS` / `wip/testing`
```

## Required deliverables

Every coding expert effort should end with:

1. code and doc changes on the named branch
2. a short result note
3. a concrete testing request for the next validator

That last item matters. Do not stop at "implementation done." Leave the next
tester a runnable request.

## Current reference examples

- `examples/2026-05-02_android-server-profile-surface/`
- `examples/2026-05-02_android-model-catalog/`
- `examples/2026-05-02_android-uniform-web-serving/`
