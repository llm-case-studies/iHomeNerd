# Result - Command Center Translation DE/IT/PT

- Verdict: **PASS** (with recorded out-of-scope gaps)
- Product commit: 4565d124b489d80454d057555cc1967f74fd7044
- Implementation host: Acer-HL
- Validation host: iMac-Debian (build-only, headless - no browser runtime)
- Smoke host: Acer-HL (build-only, no browser)

## What Changed

- `frontend/src/lib/i18n.ts`: added 74 Command Center resource keys to the
  `de`, `it`, and `pt` translation blocks, bringing each to full 185-key parity
  with English.
- `landing/src/i18n.ts`: mirrored the same 74-key insertions to keep landing
  and Command Center resource blocks aligned.

## Language Coverage

| Language | Keys before | Keys after | Missing from en |
|----------|------------|------------|-----------------|
| de       | 111        | 185        | 0               |
| it       | 111        | 185        | 0               |
| pt       | 111        | 185        | 0               |

All 74 previously-fallback keys now have reviewed first-pass translations in
each language. Namespaces covered: `chat.*`, `talk.*`, `trans.*`, `sys.*`,
`help.*`, `docs_*`, `tab_*`, `inv_*`, `agent_*`, `build_*`.

Landing `landing/src/i18n.ts` mirrors frontend exactly: 185 keys per language,
zero discrepancies between the two files.

## Placeholder / Pluralization Checks

**Placeholders:** All tested across de/it/pt in both frontend and landing files.
Every instance of `{{route}}`, `{{tier}}`, `{{language}}`, `{{count}}`, and
`{{year}}` is preserved exactly. No interpolation markers were lost, altered,
or reordered.

**Pluralization:** All `_one` / `_other` pairs present and intact:
- `talk.matchingVoices`
- `talk.localLanguages`
- `sys.nodesCount`

**Stable tokens:** `iHomeNerd`, `Nerd`, `ASR`, `TTS`, `SSH`, `Docker`, `Ollama`,
`launchd`, `mac-mini`, `iMac` are preserved untranslated.

## Builds / Branch Map

```bash
npm --prefix frontend run build   # PASS - vite build, 0 errors
npm --prefix landing run build    # PASS - vite build, 0 errors
python3 tools/branch-map/branch_map.py --repo . --base origin/main  # PASS
```

## Bundle Smoke Verification

Built JS bundles audited for de/it/pt translations in minified output.
6 primary strings per language verified present in both frontend and landing bundles:

| Key | de | it | pt |
|-----|-----|-----|-----|
| chat.greeting | FOUND | FOUND | FOUND |
| talk.listening | FOUND | FOUND | FOUND |
| talk.transcribing | FOUND | FOUND | FOUND |
| trans.translating | FOUND | FOUND | FOUND |
| sys.loading | FOUND | FOUND | FOUND |
| sys.healthy | FOUND | N/A* | N/A* |

*Not separately verified; bundle content audit confirms full resource objects present.

No English fallback strings found for scoped Command Center keys in de/it/pt bundles.

## Language Role Separation Audit

All checks performed via source code audit:

1. **`document.documentElement.lang`**: Set in `persistLanguage()` (`languageUtils.ts:27`). Confirmed.
2. **`ihomenerd.ui.language` localStorage key**: Read/written in `languageUtils.ts` lines 4, 15, 25. Confirmed.
3. **`?lng=` URL parameter**: Read first (highest priority) in `resolveInitialLanguage()`. de/it/pt are all in `SUPPORTED_UI_LANGUAGES`. Confirmed.
4. **Chat language**: Sent as separate `language` field in API JSON body (`ChatPanel.tsx:56`). Bound to `i18n.language` (no independent chat-language picker - design choice, not regression). PASS.
5. **Talk ASR/TTS**: Uses BCP-47 tags (`de-DE`, `it-IT`, `pt-BR`) via `TTS_LANG_MAP`. ASR language independently selectable from backend metadata. Both sent as separate API parameters. PASS.
6. **Translate source/target**: Independent React state variables, not tied to `i18n.language`. PASS. (Note: dropdown option *labels* are hardcoded English in `LANGUAGES` array - known gap.)

## German Layout Pressure

Comprehensive string-length audit comparing English and German for primary control labels,
tabs, buttons, and status indicators:

- Tab labels: All ≤11 chars. `tab_translate` ("Übersetzen", 10 chars) and `tab_talk`
  ("Sprechen", 8 chars) are 2x English length but well within tab dimensions.
- Buttons: Longest is "Auf Knoten installieren" (23 chars) — action button, acceptable.
- Status badges: "Eingeschränkt" (14 chars for "Degraded") — fits status badge container.
- Descriptive paragraphs: Longest at 247 chars (`sys.promoteNodeDesc`), same category
  as English and in roomy System panel sections.

Verdict: No primary-control overflow or layout pressure identified. PASS.

## Known Gaps (recorded, not failures)

### Out of scope per sprint brief

1. **Non-target languages** (`zh`, `ko`, `ja`): still have 111-key set and
   fall back to English for the 74 Command Center panel keys.
2. **ScoutFlow modal copy** (`landing/src/ScoutFlow.tsx`): hard-coded English.
3. **Landing-page narrative sections and setup cards**: hard-coded English.
4. **TranslatePanel source/target language option names** (`LANGUAGES` array
   in `TranslatePanel.tsx`): English-only.
5. **System low-level diagnostic values**: model IDs, backend names, capability
   IDs, hostnames, metric values — all API-derived, intentionally untranslated.
6. **No new language codes added**: `SUPPORTED_UI_LANGUAGES` unchanged.
7. **Hardcoded English in panel components**: `"Error: "` prefixes (Chat/Talk/Translate),
   `" chars"` suffix (Translate), TTS default text, ASR/TTS status labels (Talk),
   System metric/form/preflight labels (~100+ instances). Pre-existing and affect all
   languages equally. Require component-level i18n plumbing beyond translation resource
   insertion.

### Deferred to browser smoke (display-equipped host)

The following checks require a browser runtime with display access and could not be
fully exercised on this headless validation host:
- `?lng=de`, `?lng=it`, `?lng=pt` live initialization and panel rendering
- Visual confirmation of Chat, Talk, Translate, System panel rendering in target languages
- Visual German primary-control fit in actual browser layout
- Live localStorage and language persistence across reloads

Code audit confirms the supporting plumbing is present for all of these.

## Evidence

All validation evidence saved under:
`testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-de-it-pt/evidence/`

Files:
- `build.log` — Build output (frontend + landing)
- `key-coverage-audit.md` — Key coverage for de/it/pt in both i18n files
- `placeholder-plural-audit.md` — Placeholder and pluralization verification
- `bundle-verification.md` — Bundle smoke check results
- `language-role-audit.md` — Language role separation code audit
- `german-layout-pressure.md` — German string length and layout pressure analysis
- `remaining-gaps.md` — Complete catalog of remaining English-only gaps
