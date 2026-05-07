# OpenCode Kickoff - Command Center Translation Pilot

Paste this into the OpenCode session on `Acer-HL`.

```text
You are implementing the next iHomeNerd uniform-web-ui sprint.

Repo: iHomeNerd
Implementation host: Acer-HL
Smoke host: Acer-HL or any Node/Vite-capable host
Validation host: iMac-Debian
Sprint:
docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-07_command-center-translation-pilot/01-brief.md

Start with safety:

git status --short --branch
git fetch origin
git fetch origin docs/uniform-web-ui/command-center-translation-pilot-sprint
python3 tools/branch-map/branch_map.py --repo . --base origin/main

If there are uncommitted changes, stop and report them. Do not stash, commit,
or discard anything unless Alex explicitly approves.

Create the sprint branch from the sprint setup branch if this pack has not
landed on main yet:

git switch -c feature/uniform-web-ui/command-center-translation-pilot origin/docs/uniform-web-ui/command-center-translation-pilot-sprint

If origin/main already contains this sprint pack, use origin/main instead.

If the implementation branch already exists locally, switch to it and report
current status before editing.

Read first:
- docs/expert-briefs/README.md
- docs/expert-briefs/LESSONS.md
- docs/expert-briefs/initiatives/uniform-web-ui/README.md
- docs/expert-briefs/initiatives/uniform-web-ui/INDEX.md
- docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-07_command-center-language-parity/01-brief.md
- docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-07_command-center-translation-pilot/01-brief.md
- testing/initiatives/uniform-web-ui/2026-05-07_command-center-language-parity/result.md
- testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-pilot/request.md

Your fence:
- frontend/src/lib/i18n.ts
- landing/src/i18n.ts only if it still carries the same Command Center resource
  keys and needs parity with frontend resources
- testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-pilot/result.md
- testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-pilot/request.md, only if implementation reveals extra validation cases

Do not edit backend routes, iOS, Android, Office Clerk, PronunCo, branch-map,
or unrelated docs.

Goal:
1. add Spanish (`es`), French (`fr`), and Russian (`ru`) translations for the
   new Command Center keys that currently fall back to English
2. preserve interpolation placeholders exactly, for example `{{route}}`,
   `{{tier}}`, `{{language}}`, and `{{count}}`
3. preserve plural key structure such as `_one` and `_other`
4. keep product and technical terms stable where translation would confuse
   product behavior: `iHomeNerd`, `Nerd`, `ASR`, `TTS`, route names, model IDs,
   backend names, hostnames, capability IDs
5. do not add new UI languages and do not change language-selection plumbing
6. leave ScoutFlow, landing narrative copy, and Translate source/target language
   names out of scope except for documenting them as remaining gaps

Before handoff:
1. run npm --prefix frontend run build
2. run npm --prefix landing run build
3. verify `?lng=es`, `?lng=fr`, and `?lng=ru` initialize Command Center
4. audit that scoped Command Center keys no longer fall back to English in
   Spanish, French, or Russian
5. smoke Chat, Talk, Translate, and System in the three pilot languages
6. fill testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-pilot/result.md
7. if you find additional validation risk, add it to request.md
8. commit and push feature/uniform-web-ui/command-center-translation-pilot
```
