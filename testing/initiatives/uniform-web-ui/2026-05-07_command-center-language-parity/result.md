# Result - Command Center Language Parity

- Verdict: **PASS** (with recorded gaps)
- Product commit: `f487108`
- Validation host: iMac-Debian (code review + static build)
- Validator branch: `validation/uniform-web-ui/command-center-language-parity`

## Commands Run

```
npm --prefix frontend run build   # PASS — vite build, 0 TypeScript errors
npm --prefix landing run build    # PASS — vite build, 0 TypeScript errors
python3 tools/branch-map/branch_map.py --repo . --base origin/main  # PASS
```

## UI Languages Tested

10 supported languages confirmed in `SUPPORTED_UI_LANGUAGES`:
`en`, `zh`, `ko`, `ja`, `ru`, `de`, `fr`, `it`, `es`, `pt`

Both `frontend/src/lib/languages.ts` and `landing/src/lib/languages.ts` share the
identical `SUPPORTED_UI_LANGUAGES` array. English has the full expanded key set;
non-English language blocks still fall back to English for the newly added panel
keys, as recorded in the known gap below.

## Persistence And Handoff

| Check | Result | Source |
|---|---|---|
| `?lng=<code>` URL parameter | PASS | `resolveInitialLanguage()` in `languageUtils.ts:10-13` |
| localStorage key `ihomenerd.ui.language` | PASS | `STORAGE_KEY` in `languageUtils.ts:4` |
| `document.documentElement.lang` set | PASS | `setDocumentLang()` / `persistLanguage()` in `languageUtils.ts:26,30-32` |
| Language persists across reload | PASS | Priority: URL param > localStorage > `en` default |
| landing -> CC handoff carries `?lng=` | PASS | `ScoutFlow.tsx:370` calls `buildLanguageUrl(ccBaseUrl, currentLanguage)` |

## Command Center Coverage

| Check | Result | Source |
|---|---|---|
| App shell tabs use i18n | PASS | `CommandCenter.tsx:143` — `t(tab.labelKey)` |
| Language selector dropdown | PASS | `CommandCenter.tsx:106` — bound to `i18n.language` |
| Chat sends selected UI language | PASS | `ChatPanel.tsx:56` — `api.chat(apiMessages, null, i18n.language)` |
| Talk ASR uses BCP-47 tags | PASS | `TalkPanel.tsx:188` — `selectedAsrLanguage` is BCP-47 (e.g. `en-US`) |
| Talk TTS uses BCP-47 tags | PASS | `TalkPanel.tsx:68` — `TTS_LANG_MAP[i18n.language]` maps `en` -> `en-US` |
| Talk reply sends UI language | PASS | `TalkPanel.tsx:241` — `api.chat(..., i18n.language)` |
| Translate source/target distinct from UI | PASS | `TranslatePanel.tsx:7-15` — `LANGUAGES` array independent of `i18n.language` |

## Findings

### PASS — Core Language Parity

1. **Shared language metadata**: `SUPPORTED_UI_LANGUAGES` defined identically in both
   `frontend/src/lib/languages.ts` and `landing/src/lib/languages.ts`.
2. **URL parameter init**: `?lng=<code>` resolved with priority above localStorage.
3. **Persistence**: `localStorage` key `ihomenerd.ui.language` updated on every
   `languageChanged` event.
4. **`document.documentElement.lang`**: Set in both `persistLanguage()` and
   `setDocumentLang()`.
5. **Landing -> CC handoff**: `ScoutFlow` passes `currentLanguage` prop, and
   `buildLanguageUrl()` appends `?lng=` to the CC URL.
6. **Chat language routing**: Both `ChatPanel` and `TalkPanel` pass `i18n.language`
   to `api.chat()`.
7. **Talk BCP-47**: `TTS_LANG_MAP` maps i18n codes to BCP-47 (e.g. `en` -> `en-US`),
   used for ASR language selection and TTS synthesis. `fallbackTTS()` sets
   `utterance.lang = ttsLang` (BCP-47).
8. **Translate separation**: `LANGUAGES` array in `TranslatePanel.tsx` is a
   separate hardcoded list for translation source/target, fully independent of
   the UI language selector.
9. **Builds**: Both frontend and landing build with 0 TypeScript errors. Vite
   produces optimized bundles (frontend: 624KB JS + 35KB CSS; landing: 372KB JS + 31KB CSS).
10. **Branch map**: `branch_map.py` correctly identifies the validation branch
    under the `uniform-web-ui` initiative, +2 ahead of `origin/main`.

### GAP — Known Acceptable

**77 new panel keys have English-only fallbacks for non-English UI languages.**
When the UI is set to a non-English language (e.g. `fr`) and a Chat/Talk/Translate/
System key is requested, `i18next` falls back to the `en` value because all
192 keys have `en` translations but the 77 new panel keys lack `fr` (and other)
translations. This is the recorded gap — content is displayed, but in English.

### GAP — Remaining Hard-Coded English

The sprint targeted shell, tabs, and primary panel controls. The following areas
retain hard-coded English (see `evidence/hardcoded-english-audit.log` for full list):

**High Visibility (should be addressed in follow-up sprint):**
- **ScoutFlow modal** (`landing/src/ScoutFlow.tsx`): ~200+ user-visible strings,
  all hardcoded English. This is the landing page's primary interaction flow.
- **LandingPage "Start" section** (`landing/src/LandingPage.tsx`): Deployment
  guide narrative, timeline cards, scenario cards, path cards, node role cards —
  all hardcoded English.
- **LandingPage CTA section**: "Ask the AI you already trust" — hardcoded English.
- **TranslatePanel LANGUAGES array**: Source/target language names are English-only
  ('Auto Detect', 'English', 'Spanish', etc.).

**Medium Visibility:**
- **SystemPanel**: Capability registry table headers ('Capability', 'Status',
  'Model Backend', 'Tier'), node card labels ('Best fit', 'Strengths'), managed
  node card labels, control plane form placeholders and section headers.
- **TalkPanel**: Fallback ASR language labels, status bar labels ('not installed',
  'local runtime'), default TTS draft text 'Hello from iHomeNerd.'.

**Low Visibility (acceptable for this sprint):**
- Error message prefixes (`Error: ...` in ChatPanel)
- Runtime status labels that derive from API data
- Console.error strings
- Model IDs, backend names, capability IDs
- Format helper functions (formatBytes, formatUptime, etc.)

## Evidence

| File | Description |
|---|---|
| `evidence/frontend-build.log` | Frontend vite build output (PASS) |
| `evidence/landing-build.log` | Landing vite build output (PASS) |
| `evidence/branch-map.log` | branch_map.py output (PASS) |
| `evidence/i18n-keys-audit.log` | Per-language key distribution |
| `evidence/hardcoded-english-audit.log` | Full hardcoded English audit (26 findings) |
