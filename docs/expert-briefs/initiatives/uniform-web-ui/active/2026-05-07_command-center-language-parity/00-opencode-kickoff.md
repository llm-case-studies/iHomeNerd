# OpenCode Kickoff - Command Center Language Parity

Paste this into the OpenCode session on `Acer-HL`.

```text
You are implementing the next iHomeNerd uniform-web-ui sprint.

Repo: iHomeNerd
Implementation host: Acer-HL
Smoke host: Acer-HL or any Node/Vite-capable host
Validation host: iMac-Debian
Sprint:
docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-07_command-center-language-parity/01-brief.md

Start with safety:

git status --short --branch
git fetch origin
git fetch origin docs/uniform-web-ui/command-center-language-parity-sprint
python3 tools/branch-map/branch_map.py --repo . --base origin/main

If there are uncommitted changes, stop and report them. Do not stash, commit,
or discard anything unless Alex explicitly approves.

Create the sprint branch from the sprint setup branch if this pack has not
landed on main yet:

git switch -c feature/uniform-web-ui/command-center-language-parity origin/docs/uniform-web-ui/command-center-language-parity-sprint

If origin/main already contains this sprint pack, use origin/main instead.

If the implementation branch already exists locally, switch to it and report
current status before editing.

Read first:
- docs/expert-briefs/README.md
- docs/expert-briefs/LESSONS.md
- docs/expert-briefs/initiatives/uniform-web-ui/README.md
- docs/expert-briefs/initiatives/uniform-web-ui/INDEX.md
- docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-07_command-center-language-parity/01-brief.md
- testing/initiatives/uniform-web-ui/2026-05-07_command-center-language-parity/request.md

Your fence:
- landing/src/i18n.ts
- landing/src/LandingPage.tsx
- frontend/src/lib/i18n.ts
- frontend/src/lib/languages.ts or equivalent shared language metadata
- landing/src/lib/languages.ts or equivalent shared language metadata
- frontend/src/CommandCenter.tsx
- frontend/src/components/ChatPanel.tsx
- frontend/src/components/TalkPanel.tsx
- frontend/src/components/TranslatePanel.tsx
- frontend/src/components/SystemPanel.tsx only for high-visibility strings
- testing/initiatives/uniform-web-ui/2026-05-07_command-center-language-parity/result.md
- testing/initiatives/uniform-web-ui/2026-05-07_command-center-language-parity/request.md, only if implementation reveals extra validation cases

Do not edit backend routes, iOS, Android, Office Clerk, PronunCo, or unrelated docs.

Goal:
1. share one language option vocabulary between landing and Command Center
2. persist UI language using a stable localStorage key
3. accept ?lng=<code> in both apps
4. pass selected language from landing to Command Center when opening it
5. set document.documentElement.lang
6. align overlapping frontend English copy with current landing copy
7. convert the most visible hard-coded Command Center strings to translation keys
8. keep UI locale, chat language, ASR language, TTS voice language, and translation source/target distinct

Before handoff:
1. run npm --prefix frontend run build
2. run npm --prefix landing run build
3. smoke English plus at least one non-English language
4. verify ?lng=es initializes the UI language
5. verify localStorage and document lang update on language change
6. fill testing/initiatives/uniform-web-ui/2026-05-07_command-center-language-parity/result.md
7. if you find additional validation risk, add it to request.md
8. commit and push feature/uniform-web-ui/command-center-language-parity
```
