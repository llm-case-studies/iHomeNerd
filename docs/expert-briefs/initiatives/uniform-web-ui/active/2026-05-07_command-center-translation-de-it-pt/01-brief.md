# Expert Brief - Command Center Translation DE/IT/PT

**Date:** 2026-05-07
**Initiative:** `uniform-web-ui`
**Status:** active sprint
**Audience:** OpenCode implementer on `Acer-HL`

## Why This Sprint Exists

The `2026-05-07_command-center-translation-pilot` sprint added first-pass
Spanish, French, and Russian translations for scoped Command Center keys and
validated the localization workflow.

This sprint applies the same scope to the next language group:

```text
de, it, pt
```

It should not expand the product surface. The work is still the Command Center
resource keys only, with the same placeholder, pluralization, and language-role
rules.

## Execution Fence

- Repo: `iHomeNerd`
- Base branch: `origin/docs/uniform-web-ui/command-center-translation-de-it-pt-sprint`
  until this sprint pack lands on `main`; then use `origin/main`
- Working branch: `feature/uniform-web-ui/command-center-translation-de-it-pt`
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
- `testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-pilot/result.md`
- `testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-de-it-pt/request.md`

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

1. Command Center can render the scoped primary panel UI in `de`, `it`, and
   `pt` without falling back to English for those keys.
2. Translation placeholders and pluralization forms remain intact.
3. UI locale, chat language, ASR language, TTS language, and Translate
   source/target language remain distinct.
4. Remaining gaps are explicit: CJK languages, ScoutFlow, landing narrative,
   and Translate source/target language names.

## Required Scope

### A. Languages

Add translations for:

```text
de, it, pt
```

Do not add new supported language codes.

### B. Scoped key coverage

Translate the Command Center keys that exist in English but are absent from the
`de`, `it`, and `pt` blocks. The implementer should compute the exact missing
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
- pluralization key shape: `_one`, `_other`
- product names: `iHomeNerd`, `Nerd`
- protocol and runtime terms where translation would obscure behavior:
  `ASR`, `TTS`, `SSH`, model IDs, backend names, route names, hostnames,
  capability IDs

Use natural UI phrasing, not literal word-for-word translation. German labels
should be checked for length pressure in compact controls; prefer clear concise
phrasing over ornate wording.

### D. Out-of-scope gaps to keep recorded

Do not solve these in this sprint:

- ScoutFlow modal hard-coded English
- landing-page narrative sections and setup cards
- TranslatePanel source/target language option names
- CJK languages: `zh`, `ko`, `ja`
- low-level diagnostic values, model IDs, capability IDs, backend names, host
  names, metric values, or API-derived status details
- backend, mobile-native, or PronunCo localization

## Build And Smoke Expectations

Before handoff:

1. run `python3 tools/branch-map/branch_map.py --repo . --base origin/main`
2. run frontend and landing builds
3. audit key coverage for `de`, `it`, and `pt`
4. smoke Command Center with `?lng=de`, `?lng=it`, and `?lng=pt`
5. open Chat, Talk, Translate, and System panels in each language
6. verify no scoped key renders as English fallback, an i18n key name, or blank
   text in those three languages
7. record German layout pressure if any primary label/control looks too long
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

1. implementation on `feature/uniform-web-ui/command-center-translation-de-it-pt`
2. concise result note using `02-result-template.md`
3. updated validator handoff at:
   - `testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-de-it-pt/request.md`

## Done Means

- German, Italian, and Portuguese include the scoped Command Center keys
- scoped keys do not fall back to English in those three languages
- placeholders and plural forms are preserved
- builds pass, or blockers are recorded precisely
- validation request tells iMac-Debian exactly what to probe
