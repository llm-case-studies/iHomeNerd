# Test Request - Command Center Translation CJK

**Date issued:** 2026-05-07
**Initiative:** `uniform-web-ui`
**Sprint:** `2026-05-07_command-center-translation-cjk`
**Target branch:** `feature/uniform-web-ui/command-center-translation-cjk`
**Validator branch:** `validation/uniform-web-ui/command-center-translation-cjk`
**Validator host:** `iMac-Debian`
**Runtime host:** any host that can run the Vite frontend and landing apps

## What You Are Validating

Validate that the final current Command Center localization wave closes the
known English fallback gap for Chinese, Korean, and Japanese without changing
language plumbing or mixing language roles.

Core checks:

1. scoped Command Center keys have `zh`, `ko`, and `ja` translations
2. all ten advertised UI languages now have scoped Command Center key coverage
3. placeholders such as `{{route}}`, `{{tier}}`, `{{language}}`, `{{count}}`,
   and `{{year}}` are preserved exactly
4. plural keys such as `_one` and `_other` remain paired where used
5. `?lng=zh`, `?lng=ko`, and `?lng=ja` initialize Command Center
6. Chat, Talk, Translate, and System panels render localized primary strings in
   the three languages
7. UI locale remains separate from chat language, ASR/TTS language tags, and
   Translate source/target controls
8. CJK strings do not create obvious primary-control overflow, awkward wrapping,
   or unreadable visual density
9. remaining out-of-scope gaps are recorded rather than hidden

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
  localization sprints has a value in `zh`, `ko`, and `ja`
- all ten supported UI languages have the same scoped Command Center key set
- no scoped value is identical to English unless the value is a
  product/technical token that should remain stable, such as `iHomeNerd`,
  `Nerd`, `ASR`, `TTS`, `SSH`, `Docker`, `Ollama`, a route name, a model ID,
  or a backend name
- placeholders are identical between English and each language value
- pluralized keys retain the same `_one` / `_other` structure

## UI Smoke

Smoke Command Center in a browser or equivalent automated harness.

Minimum probes:

1. Open Command Center with `?lng=zh`.
2. Confirm `document.documentElement.lang` is `zh`.
3. Confirm app tabs and primary panel labels are Chinese.
4. Open Chat and confirm greeting, placeholder, capability/status copy, and
   unavailable/error empty states are not English fallbacks.
5. Open Talk and confirm recording/status, voice, ASR availability, TTS-only,
   and transcript labels are not English fallbacks.
6. Open Translate and confirm placeholder, unavailable hint, button/status, and
   copy tooltip/title are not English fallbacks.
7. Open System and confirm loading, health, node-load, control-plane, managed
   nodes, preflight, and plugin empty states are not English fallbacks.
8. Check whether CJK primary controls, tabs, status labels, or compact panels
   visibly overflow or wrap awkwardly.
9. Repeat the same smoke for `?lng=ko`.
10. Repeat the same smoke for `?lng=ja`.
11. Change the language selector between `zh`, `ko`, and `ja` and confirm local
    storage key `ihomenerd.ui.language` updates.
12. Confirm Chat still sends `i18n.language`.
13. Confirm Talk ASR/TTS controls still use BCP-47 tags.
14. Confirm Translate source/target controls remain separate from UI locale.

## CJK Readability Audit

Record:

- whether Chinese and Japanese strings avoid unnatural English-style spacing
- whether Korean spacing looks plausible and readable
- whether native punctuation is used where practical
- whether product and technical tokens remain stable
- whether any compact control or status label becomes visually dense or clipped
- whether any English fallback remains in scoped Command Center strings

This is a first-pass localization sprint, not a professional copy review, but
the result should be credible enough that the UI no longer looks half-English
in these languages.

## Hard-Coded English Audit

Record remaining high-visibility English strings. Do not fail for the following
known out-of-scope areas if they are documented:

- ScoutFlow modal copy
- landing-page narrative sections and setup cards
- TranslatePanel source/target language option names
- System low-level metric labels, model IDs, route IDs, backend names,
  capability IDs, hostnames, API-derived values, and diagnostic numbers
- component-level hard-coded strings that were already recorded in previous
  validation, such as error prefixes and some status suffixes

Fail if scoped Command Center keys in Chat, Talk, Translate, System, tabs, or
help/docs/investigate/agents/builder resources still render as English fallback
for `zh`, `ko`, or `ja`.

## Save Evidence

Save:

- build logs
- BranchMap output summary
- key coverage audit
- placeholder/pluralization audit
- browser smoke notes or screenshots for `zh`, `ko`, and `ja`
- local storage / document language evidence
- CJK readability and visual-fit notes
- remaining hard-coded English audit

under:

```text
testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-cjk/evidence/
```

## Result

Write findings to:

```text
testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-cjk/result.md
```

Include:

- pass/fail verdict
- product commit under test
- commands run
- key coverage result for `zh`, `ko`, and `ja`
- all-ten-language scoped parity result
- placeholder/pluralization result
- UI smoke result for Chat, Talk, Translate, and System
- CJK readability and visual-fit result
- remaining English-only gaps
- any behavioral regression in language persistence or language-role separation
