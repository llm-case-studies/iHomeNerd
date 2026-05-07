# Expert Brief - Command Center Translation CJK

**Date:** 2026-05-07
**Initiative:** `uniform-web-ui`
**Status:** active sprint
**Audience:** OpenCode implementer on `Acer-HL`

## Why This Sprint Exists

The Command Center localization work has now covered:

```text
es, fr, ru, de, it, pt
```

The remaining advertised UI languages are:

```text
zh, ko, ja
```

This sprint should close the scoped Command Center fallback gap for Chinese,
Korean, and Japanese. It should not expand the product surface or change
language plumbing. The hard part is translation quality and UI fit, not
architecture.

## Execution Fence

- Repo: `iHomeNerd`
- Base branch: `origin/docs/uniform-web-ui/command-center-translation-cjk-sprint`
  until this sprint pack lands on `main`; then use `origin/main`
- Working branch: `feature/uniform-web-ui/command-center-translation-cjk`
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
- `docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-07_command-center-translation-pilot/01-brief.md`
- `docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-07_command-center-translation-de-it-pt/01-brief.md`
- `testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-de-it-pt/result.md`
- `testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-cjk/request.md`

Relevant source:

- `frontend/src/lib/i18n.ts`
- `landing/src/i18n.ts`
- `frontend/src/lib/languages.ts`
- `landing/src/lib/languages.ts`
- `frontend/src/components/ChatPanel.tsx`
- `frontend/src/components/TalkPanel.tsx`
- `frontend/src/components/TranslatePanel.tsx`
- `frontend/src/components/SystemPanel.tsx`

Useful governance tool:

- `tools/branch-map/README.md`
- `tools/branch-map/branch_map.py`

## Product Goal

After this sprint:

1. Command Center can render the scoped primary panel UI in `zh`, `ko`, and
   `ja` without falling back to English for those keys.
2. All ten advertised UI languages have scoped Command Center resource parity.
3. Translation placeholders and pluralization forms remain intact.
4. UI locale, chat language, ASR language, TTS language, and Translate
   source/target language remain distinct.
5. Remaining localization gaps are explicit and no longer confused with
   Command Center key coverage.

## Required Scope

### A. Languages

Add translations for:

```text
zh, ko, ja
```

Do not add new supported language codes.

### B. Scoped key coverage

Translate the Command Center keys that exist in English but are absent from the
`zh`, `ko`, and `ja` blocks. The implementer should compute the exact missing
list from `frontend/src/lib/i18n.ts`.

Expected namespaces include:

```text
chat.*
talk.*
trans.*
sys.*
help.*
docs_*
tab_*
inv_*
agent_*
build_*
app_title
status_online
```

If `landing/src/i18n.ts` carries the same Command Center resource keys, keep
those language resource blocks aligned there too. Do not broaden this into
translating the landing narrative or ScoutFlow modal copy.

### C. Translation rules

Preserve these exactly:

- interpolation placeholders: `{{route}}`, `{{tier}}`, `{{language}}`,
  `{{count}}`, `{{year}}`
- pluralization key shape: `_one`, `_other`, even when the language does not
  naturally inflect plurals the same way English does
- product names: `iHomeNerd`, `Nerd`
- protocol and runtime terms where translation would obscure behavior:
  `ASR`, `TTS`, `SSH`, model IDs, backend names, route names, hostnames,
  capability IDs

Use natural UI phrasing rather than literal word-for-word translation. Prefer
short, clear labels for controls and tabs.

### D. CJK-specific quality rules

Pay special attention to:

- Chinese and Japanese usually do not separate words with spaces
- Korean spacing should be natural and readable, not mechanically copied from
  English
- punctuation should look native where practical, while preserving placeholders
  and technical tokens exactly
- button and tab labels should remain compact
- descriptive strings may be longer, but should not become awkward blocks of
  untranslated technical English
- no i18n key names or blank strings should appear in UI output

### E. Out-of-scope gaps to keep recorded

Do not solve these in this sprint:

- ScoutFlow modal hard-coded English
- landing-page narrative sections and setup cards
- TranslatePanel source/target language option names
- low-level diagnostic values, model IDs, capability IDs, backend names, host
  names, metric values, or API-derived status details
- backend, mobile-native, or PronunCo localization

## Build And Smoke Expectations

Before handoff:

1. run `python3 tools/branch-map/branch_map.py --repo . --base origin/main`
2. run frontend and landing builds
3. audit key coverage for `zh`, `ko`, and `ja`
4. smoke Command Center with `?lng=zh`, `?lng=ko`, and `?lng=ja`
5. open Chat, Talk, Translate, and System panels in each language
6. verify no scoped key renders as English fallback, an i18n key name, or blank
   text in those three languages
7. record CJK visual-fit, wrapping, punctuation, or readability concerns
8. record remaining hard-coded English and out-of-scope gaps precisely

Suggested commands:

```bash
npm --prefix frontend run build
npm --prefix landing run build
python3 tools/branch-map/branch_map.py --repo . --base origin/main
```

Use the repo's actual scripts if names differ.

## Deliverables

Required:

1. implementation on `feature/uniform-web-ui/command-center-translation-cjk`
2. concise result note using `02-result-template.md`
3. updated validator handoff at:
   - `testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-cjk/request.md`

## Done Means

- Chinese, Korean, and Japanese include the scoped Command Center keys
- scoped keys do not fall back to English in those three languages
- all ten advertised UI languages have scoped Command Center key coverage
- placeholders and plural forms are preserved
- builds pass, or blockers are recorded precisely
- validation request tells iMac-Debian exactly what to probe
