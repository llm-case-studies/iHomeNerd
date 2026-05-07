# Test Request - Command Center Translation DE/IT/PT

**Date issued:** 2026-05-07
**Initiative:** `uniform-web-ui`
**Sprint:** `2026-05-07_command-center-translation-de-it-pt`
**Target branch:** `feature/uniform-web-ui/command-center-translation-de-it-pt`
**Validator branch:** `validation/uniform-web-ui/command-center-translation-de-it-pt`
**Validator host:** `iMac-Debian`
**Runtime host:** any host that can run the Vite frontend and landing apps

## What You Are Validating

Validate that the second Command Center localization wave closes the known
English fallback gap for German, Italian, and Portuguese without changing
language plumbing or mixing language roles.

Core checks:

1. scoped Command Center keys have `de`, `it`, and `pt` translations
2. placeholders such as `{{route}}`, `{{tier}}`, `{{language}}`, `{{count}}`,
   and `{{year}}` are preserved exactly
3. plural keys such as `_one` and `_other` remain paired where used
4. `?lng=de`, `?lng=it`, and `?lng=pt` initialize Command Center
5. Chat, Talk, Translate, and System panels render localized primary strings in
   the three languages
6. UI locale remains separate from chat language, ASR/TTS language tags, and
   Translate source/target controls
7. German strings do not create obvious primary-control overflow or unreadable
   layout pressure
8. out-of-scope gaps remain recorded rather than hidden

## Product Commit Under Test

Record:

```bash
git rev-parse HEAD
```

from the product branch under test.

## Required Checks

Run:

```bash
npm --prefix frontend run build
npm --prefix landing run build
python3 tools/branch-map/branch_map.py --repo . --base origin/main
```

If `npm` dependencies are unavailable, record the exact blocker rather than
inventing a result.

## Key Coverage Audit

Audit `frontend/src/lib/i18n.ts` and, if updated by the implementation,
`landing/src/i18n.ts`.

Minimum acceptance:

- every scoped English Command Center key added or used by the previous
  localization sprints has a non-English value in `de`, `it`, and `pt`
- no scoped value is identical to English unless the value is a
  product/technical token that should remain stable, such as `iHomeNerd`,
  `Nerd`, `ASR`, `TTS`, `SSH`, `Docker`, `Ollama`, a route name, a model ID,
  or a backend name
- placeholders are identical between English and each language value
- pluralized keys retain the same `_one` / `_other` structure

Do not fail this sprint for missing `zh`, `ko`, or `ja` translations.

## UI Smoke

Smoke Command Center in a browser or equivalent automated harness.

Minimum probes:

1. Open Command Center with `?lng=de`.
2. Confirm `document.documentElement.lang` is `de`.
3. Confirm app tabs and primary panel labels are German.
4. Open Chat and confirm greeting, placeholder, capability/status copy, and
   unavailable/error empty states are not English fallbacks.
5. Open Talk and confirm recording/status, voice, ASR availability, TTS-only,
   and transcript labels are not English fallbacks.
6. Open Translate and confirm placeholder, unavailable hint, button/status, and
   copy tooltip/title are not English fallbacks.
7. Open System and confirm loading, health, node-load, control-plane, managed
   nodes, preflight, and plugin empty states are not English fallbacks.
8. Check whether German primary controls or status labels visibly overflow or
   crowd their containers.
9. Repeat the same smoke for `?lng=it`.
10. Repeat the same smoke for `?lng=pt`.
11. Change the language selector between `de`, `it`, and `pt` and confirm local
    storage key `ihomenerd.ui.language` updates.
12. Confirm Chat still sends `i18n.language`.
13. Confirm Talk ASR/TTS controls still use BCP-47 tags.
14. Confirm Translate source/target controls remain separate from UI locale.

## Hard-Coded English Audit

Record remaining high-visibility English strings. Do not fail for the following
known out-of-scope areas if they are documented:

- ScoutFlow modal copy
- landing-page narrative sections and setup cards
- TranslatePanel source/target language option names
- CJK UI languages: `zh`, `ko`, `ja`
- System low-level metric labels, model IDs, route IDs, backend names,
  capability IDs, hostnames, API-derived values, and diagnostic numbers

Fail if scoped Command Center keys in Chat, Talk, Translate, System, tabs, or
help/docs/investigate/agents/builder resources still render as English fallback
for `de`, `it`, or `pt`.

## Save Evidence

Save:

- build logs
- BranchMap output summary
- key coverage audit
- placeholder/pluralization audit
- browser smoke notes or screenshots for `de`, `it`, and `pt`
- local storage / document language evidence
- German layout pressure notes
- remaining hard-coded English audit

under:

```text
testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-de-it-pt/evidence/
```

## Result

Write findings to:

```text
testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-de-it-pt/result.md
```

Include:

- pass/fail verdict
- product commit under test
- commands run
- key coverage result for `de`, `it`, and `pt`
- placeholder/pluralization result
- UI smoke result for Chat, Talk, Translate, and System
- German layout pressure result
- remaining English-only gaps
- any behavioral regression in language persistence or language-role separation
