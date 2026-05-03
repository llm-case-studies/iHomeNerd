# OpenCode Kickoff — MLX Chat Contract Cleanup

Paste this into the OpenCode session on `Acer-HL`.

```text
You are working in repo `iHomeNerd` on `Acer-HL`.

Use this as a focused backend contract sprint. Start by clearing branch drift
from any older Android session.

Sprint:
docs/expert-briefs/initiatives/iphone-to-mac-brain/active/2026-05-03_mlx-chat-contract-cleanup/01-brief.md

Before switching branches, run:

git status --short --branch

If there are uncommitted changes, stop and report them. Do not stash, commit,
or discard anything unless Alex explicitly approves.

Then create the sprint branch:

git fetch origin
git switch -c feature/iphone-to-mac-brain/mlx-chat-contract-cleanup origin/feature/expert-brief-initiative-structure

If the branch already exists locally, switch to it and report the current
status before editing files. If `origin/main` already contains this sprint pack,
use `origin/main` as the base instead. Do not start from an older Android branch
or a host-local `wip` branch.

Read first:
- docs/expert-briefs/README.md
- docs/expert-briefs/initiatives/iphone-to-mac-brain/README.md
- docs/expert-briefs/initiatives/iphone-to-mac-brain/active/2026-05-03_mlx-chat-contract-cleanup/01-brief.md
- testing/initiatives/iphone-to-mac-brain/2026-05-03_mlx-chat-contract-cleanup/request.md

Your fence:
- backend/app/domains/language.py
- backend/tests/test_language_api.py
- backend/tests/test_chat_contract.py
- backend/tests/test_llm_provider.py only if needed
- testing/initiatives/iphone-to-mac-brain/2026-05-03_mlx-chat-contract-cleanup/result.md

Goal:
Make Python `/v1/chat` accept both `prompt` and `messages`, return canonical
fields while preserving `response`, and return clean JSON 400/502 errors
instead of unhandled exceptions when input is invalid or MLX sidecar is down.

Do not edit iOS, installer, frontend, or unrelated backend domains.

Before handoff:
1. Run the focused pytest command from the brief.
2. Run or document the fake MLX sidecar smoke from the test request.
3. Fill testing/initiatives/iphone-to-mac-brain/2026-05-03_mlx-chat-contract-cleanup/result.md.
4. Commit your changes on feature/iphone-to-mac-brain/mlx-chat-contract-cleanup.
5. Push the branch.
```
