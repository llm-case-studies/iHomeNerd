# Expert Brief - Command Center Language Parity

**Date:** 2026-05-07
**Initiative:** `uniform-web-ui`
**Status:** active sprint
**Audience:** OpenCode implementer on `Acer-HL`

## Why This Sprint Exists

The landing page and Command Center both expose the same language selector:

```text
en, zh, ko, ja, ru, de, fr, it, es, pt
```

But the implementation is not yet coherent:

- `landing/src/i18n.ts` and `frontend/src/lib/i18n.ts` are copied resources and
  already differ
- landing English copy reflects the newer public/local-AI positioning, while
  Command Center still carries older `v2.0` / launch phrasing in shared keys
- language choice is not clearly persisted or handed from landing to Command
  Center
- chat, Talk, Translate, and System panels each treat language slightly
  differently
- many visible Command Center strings are still hard-coded English

This sprint should make the shared web UI honest: the user can choose a UI
language, keep that choice across landing and Command Center, and see the most
visible app shell and primary controls follow it.

## Execution Fence

- Repo: `iHomeNerd`
- Base branch: `origin/docs/uniform-web-ui/command-center-language-parity-sprint`
  until this sprint pack lands on `main`; then use `origin/main`
- Working branch: `feature/uniform-web-ui/command-center-language-parity`
- Merge target: `main` after validation
- Implementation host: `Acer-HL`
- Smoke host: `Acer-HL` or any Node/Vite-capable host
- Validation host: `iMac-Debian`

Temporary branch-base exception: this sprint pack is born on an unmerged docs
setup branch. If you run the sprint before that setup branch lands on `main`,
base the implementation branch from the docs setup branch so the kickoff,
brief, and testing request are present in the working tree.

## References

Read first:

- `docs/expert-briefs/README.md`
- `docs/expert-briefs/LESSONS.md`
- `docs/expert-briefs/initiatives/uniform-web-ui/README.md`
- `docs/expert-briefs/initiatives/uniform-web-ui/INDEX.md`
- `docs/ARCHITECTURE_NODE_PARITY.md`
- `testing/initiatives/uniform-web-ui/2026-05-07_command-center-language-parity/request.md`

Relevant source:

- `landing/src/i18n.ts`
- `landing/src/LandingPage.tsx`
- `frontend/src/lib/i18n.ts`
- `frontend/src/CommandCenter.tsx`
- `frontend/src/components/ChatPanel.tsx`
- `frontend/src/components/TalkPanel.tsx`
- `frontend/src/components/TranslatePanel.tsx`
- `frontend/src/components/SystemPanel.tsx`

Useful new governance tool:

- `tools/branch-map/README.md`
- `tools/branch-map/branch_map.py`

## Product Goal

After this sprint:

1. landing and Command Center share one language vocabulary
2. a user-selected UI language persists across reloads
3. landing can hand the selected UI language into Command Center
4. Command Center sets the document language consistently
5. the most visible hard-coded English in Command Center is either translated
   or explicitly recorded as out of scope
6. chat, Talk, and Translate keep separate but understandable language roles

## Required Scope

### A. Shared language metadata

Create a small shared source for supported UI languages, for example:

```text
frontend/src/lib/languages.ts
landing/src/lib/languages.ts
```

or another low-risk shape that works with the current Vite apps.

The important part is that landing and Command Center stop carrying separate
hand-written option lists.

### B. Language persistence and handoff

Persist selected UI language under a stable key such as:

```text
ihomenerd.ui.language
```

Both apps should:

- initialize from `?lng=<code>` when present
- otherwise initialize from local storage when present
- otherwise fall back to English
- write changes back to local storage
- set `document.documentElement.lang`

If landing opens Command Center, preserve the current language using `?lng=`.

### C. Resource alignment

Align overlapping i18n resources enough that the app no longer mixes old and
new positioning. At minimum, make the shared English keys in
`frontend/src/lib/i18n.ts` match the newer landing wording where those keys
overlap.

Do not hand-translate brand-new paragraphs unless needed. If non-English
landing copy remains older in some places, record that honestly in the result.

### D. Command Center visible string cleanup

Convert the most visible hard-coded English strings to translation keys in:

- top-level app shell
- `TranslatePanel`
- `TalkPanel` primary controls/status labels
- high-visibility `SystemPanel` section headers and empty/loading states

Do not attempt to translate every metric label, backend diagnostic value,
capability name, model name, or low-level node-control field in this sprint.

### E. Language-role clarity

Keep these concepts distinct:

- UI locale: selected language for labels and shell copy
- chat language: value passed to `/v1/chat`
- ASR language: BCP-47 recognition language in Talk
- TTS language/voice: BCP-47 speech output target
- TranslatePanel source/target language: translation task controls

If the UI needs a small comment/helper to avoid mixing these up, add it.

## Out Of Scope

- full localization of every SystemPanel diagnostic label
- backend translation model changes
- adding new supported languages
- changing ASR/TTS backend contracts
- PronunCo language-learning semantics
- mobile-native iOS/Android localization
- landing-page redesign
- changing product behavior outside language selection/display

## Build And Smoke Expectations

Before handoff:

1. run `python3 tools/branch-map/branch_map.py --repo . --base origin/main`
   before or after branch creation and record any surprising branch warnings
2. run frontend type/build checks for touched Vite apps
3. smoke both landing and Command Center in at least English and one non-English
   language
4. verify `?lng=es` or another non-English code initializes the UI language
5. verify changing language updates local storage and `document.documentElement.lang`
6. verify chat still receives the selected UI language value

Suggested commands:

```bash
npm --prefix frontend run build
npm --prefix landing run build
python3 tools/branch-map/branch_map.py --repo . --base origin/main
```

Use the repo's actual scripts if names differ.

## Deliverables

Required:

1. implementation on `feature/uniform-web-ui/command-center-language-parity`
2. concise result note using `02-result-template.md`
3. updated validator handoff at:
   - `testing/initiatives/uniform-web-ui/2026-05-07_command-center-language-parity/request.md`

## Done Means

- language selector options come from shared metadata or an equivalent single
  source
- language selection persists and transfers from landing to Command Center
- visible Command Center labels are meaningfully less English-only
- frontend and landing builds pass, or blockers are recorded precisely
- validation request tells iMac-Debian exactly what to probe
