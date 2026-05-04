# OpenCode Kickoff — Frontend Model Selector

Paste this into the OpenCode session on `Acer-HL`.

```text
You are working in repo `iHomeNerd` on `Acer-HL`.

Use this as a focused frontend sprint under the `uniform-web-ui` initiative.
Start by clearing branch drift from any older session.

Sprint:
docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-03_frontend-model-selector/01-brief.md

Before switching branches, run:

git status --short --branch

If there are uncommitted changes, stop and report them. Do not stash, commit,
or discard anything unless Alex explicitly approves.

Then create the sprint branch:

git fetch origin
git switch -c feature/uniform-web-ui/frontend-model-selector origin/main

If the branch already exists locally, switch to it and report current status
before editing files.

Read first:
- docs/ARCHITECTURE_NODE_PARITY.md (sections §3 and §4 are load-bearing)
- docs/expert-briefs/README.md
- docs/expert-briefs/initiatives/uniform-web-ui/README.md
- docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-03_frontend-model-selector/01-brief.md
- testing/initiatives/uniform-web-ui/2026-05-03_frontend-model-selector/request.md (if missing, create from the legacy request listed in testing/initiatives/uniform-web-ui/INDEX.md)

Your fence:
- frontend/src/components/ModelsPanel.tsx (new)
- frontend/src/CommandCenter.tsx (one panel slot)
- frontend/src/ types if you must add a small inline type
- testing/initiatives/uniform-web-ui/2026-05-03_frontend-model-selector/result.md
- testing/initiatives/uniform-web-ui/2026-05-03_frontend-model-selector/evidence/

Do not edit iOS, Android, backend, installer, or unrelated frontend panels
during this sprint unless you find a tiny defect that directly blocks
the sprint. If you do find one, record the defect and stop.

Goal:
Add a small ModelsPanel React component to the Command Center SPA that
calls GET /v1/models and POST /v1/models/load and displays the result
honestly (load_time_seconds on success, status-coded detail on failure).

Test against the backend node first (it already serves /v1/chat and
will serve /v1/models once a node implements it; pointing your browser at
http://<backend-host>:8000/ is the smoke path). The same bundle should
work later against an iOS or Android node — that is the cross-platform
parity the menu surface promises.

Before handoff:
1. cd frontend && npm install && npm run build — bundle must land in
   backend/app/static/.
2. Browser smoke against the backend node, captured in evidence/.
3. Treat the test request as the minimum validation floor. If your
   implementation reveals additional cases (empty model list, race on
   concurrent loads, etc.), add them to request.md.
4. Fill testing/initiatives/uniform-web-ui/2026-05-03_frontend-model-selector/result.md with the final commit SHA on the working branch.
5. Push feature/uniform-web-ui/frontend-model-selector.
```
