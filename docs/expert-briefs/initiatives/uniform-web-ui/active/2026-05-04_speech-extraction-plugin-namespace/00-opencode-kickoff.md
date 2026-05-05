# OpenCode Kickoff - Speech Extraction + Plugin Namespace

Paste this into the OpenCode session on `Acer-HL`.

```text
You are implementing the next iHomeNerd uniform-web-ui sprint.

Repo: iHomeNerd
Implementation host: Acer-HL
Smoke host: Acer-HL (or any Python-capable host with the repo checked out)
Validation host: iMac-Debian
Sprint:
docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-04_speech-extraction-plugin-namespace/01-brief.md

Start with safety:

git status --short --branch

If there are uncommitted changes, stop and report them. Do not stash, commit,
or discard anything unless Alex explicitly approves.

Then create the sprint branch:

git fetch origin
git switch -c feature/uniform-web-ui/speech-extraction-plugin-namespace origin/main

If the branch already exists locally, switch to it and report current status
before editing.

Read first:
- docs/expert-briefs/README.md
- docs/expert-briefs/LESSONS.md
- docs/expert-briefs/initiatives/uniform-web-ui/README.md
- docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-04_speech-extraction-plugin-namespace/01-brief.md
- docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-04_client-surface-boundary-review/round-2-synthesis.md
- testing/initiatives/uniform-web-ui/2026-05-04_speech-extraction-plugin-namespace/request.md

Your fence:
- backend/app/main.py
- backend/app/capabilities.py
- backend/app/plugins/pronunco.py
- backend/app/domains/
- testing/initiatives/uniform-web-ui/2026-05-04_speech-extraction-plugin-namespace/result.md
- testing/initiatives/uniform-web-ui/2026-05-04_speech-extraction-plugin-namespace/request.md, only if implementation reveals extra validation cases

Do not edit frontend, iOS, Android, unrelated docs routers, or client app repos.

Goal:
1. move generic speech routes out of plugins/pronunco.py into a core domain router
2. move PronunCo-specific routes behind /v1/plugins/pronunco/...
3. split /capabilities into core vs plugins
4. remove the redundant flat /v1/image-extract stub instead of preserving it

Before handoff:
1. run focused backend tests or curl smoke relevant to the touched routes
2. fill testing/initiatives/uniform-web-ui/2026-05-04_speech-extraction-plugin-namespace/result.md
3. if you find additional validation risk, add it to request.md
4. commit and push feature/uniform-web-ui/speech-extraction-plugin-namespace
```

