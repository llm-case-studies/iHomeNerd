# Result - Command Center Language Parity

- Verdict: PASS (smoke-ready for validation on iMac-Debian)
- Working commit: a51d14ca618466516416fb0ceffc253b3a617f5e
- Implementation host: Acer-HL
- Smoke host: Acer-HL

## What Changed

### A. Shared language metadata
- `frontend/src/lib/languages.ts` and `landing/src/lib/languages.ts`: single-source `SUPPORTED_UI_LANGUAGES` array with 10 languages (en, zh, ko, ja, ru, de, fr, it, es, pt), `UiLanguage` interface, `DEFAULT_UI_LANGUAGE`, and `isSupportedLanguage()` guard. Both files are identical.
- Both `CommandCenter.tsx` and `LandingPage.tsx` now render the language `<select>` from `SUPPORTED_UI_LANGUAGES.map()` instead of hardcoded `<option>` lists.

### B. Language persistence and handoff
- `frontend/src/lib/languageUtils.ts` and `landing/src/lib/languageUtils.ts`: shared utility modules with:
  - `STORAGE_KEY = 'ihomenerd.ui.language'`
  - `resolveInitialLanguage()`: checks `?lng=`, then localStorage, falls back to `en`
  - `persistLanguage(code)`: writes localStorage and sets `document.documentElement.lang`
  - `initLanguagePersistence(i18n)`: calls `resolveInitialLanguage()`, sets initial lang, subscribes to `languageChanged` for persistence
  - `buildLanguageUrl(baseUrl, lang)`: appends `?lng=<code>` via URL API
- Both `i18n.ts` files call `initLanguagePersistence(i18n)` at initialization.
- `LandingPage.tsx` passes `currentLanguage={i18n.language}` to `<ScoutFlow>`.
- `ScoutFlow.tsx` appends `?lng=<currentLanguage>` to the "Open Command Center" URL when the selected language is non-English.

### C. i18n resource alignment
- The shared keys already used by Command Center (`app_title`, `status_online`, `tab_*`, `talk_*`, `trans_*`, `docs_*`, `inv_*`, `agent_*`, `build_*`, `sys_*`, `help.*`) were already aligned between landing and frontend English copies. No changes needed.
- Landing-specific keys (`hero_*`, `nav_*`, `sec_*`, `feat_*`, `cta_*`, `footer_*`) that differ between the two i18n files are not rendered by Command Center, so the divergence is benign.

### D. Command Center visible string cleanup
Added 77 new translation keys to the English resource block in both i18n files covering:

- **ChatPanel**: greeting, placeholder, error message, capability info, not-installed messages
- **TalkPanel**: listening/transcribing status, labels (You/Nerd), recognition language, voice, mic prompt, reply/speak controls, error messages (21 strings converted)
- **TranslatePanel**: placeholder, empty state, translating indicator, copy title, not-installed hints (8 strings converted)
- **SystemPanel**: section headers, loading/empty states, button labels, promotional hints (27 strings converted)

All 12 modified component files now use `t('key')` for visible strings instead of hardcoded English.

Non-English language blocks (zh, ko, ja, ru, de, fr, it, es, pt) do not yet contain translations for the 77 new keys. They fall back to the English values via `fallbackLng: "en"`.

### E. Language-role clarity
- **UI locale**: `i18n.language`, persisted via `languageChanged` event, sets `document.documentElement.lang`
- **Chat language**: `i18n.language` passed to `/v1/chat` as `language` parameter (unchanged from prior code in `ChatPanel.handleSend` and `TalkPanel.handleReplyAndSpeak`)
- **ASR language**: BCP-47 tag from `selectedAsrLanguage` state, distinct from i18n language (unchanged)
- **TTS language**: BCP-47 tag derived from `TTS_LANG_MAP[i18n.language]`, distinct (unchanged)
- **Translate source/target**: `sourceLang`/`targetLang` state, distinct from UI locale (unchanged, still uses the `LANGUAGES` constant for translatable languages)

## Language Behavior

- `?lng=<code>` initialization: `resolveInitialLanguage()` in both apps reads `new URLSearchParams(window.location.search).get('lng')` before checking localStorage or falling back to `en`.
- localStorage: `persistLanguage()` writes key `ihomenerd.ui.language` on every `languageChanged` event.
- document.lang: `persistLanguage()` sets `document.documentElement.lang` alongside localStorage.
- Landing -> Command Center handoff: `ScoutFlow` appends `?lng=<currentLanguage>` to the Command Center URL via `buildLanguageUrl()`.

## Builds / Tests

- `npm --prefix frontend run build`: passed (vite v6.4.2, 2129 modules, output to `backend/app/static/`)
- `npm --prefix landing run build`: passed (vite v6.4.2, 1710 modules, output to `landing/dist/`)
- `python3 tools/branch-map/branch_map.py --repo . --base origin/main`: 29 warnings, all pre-existing and unrelated to this sprint

## Smoke Notes

- Both apps build successfully from source without TypeScript errors.
- No runtime smoke was possible on this host (Acer-HL) without a running backend; validation smoke is deferred to iMac-Debian.
- The code-level changes (shared language options, ?lng= parsing, localStorage persistence, document lang, translation key usage) are visible in the diff and should be probed by the validator.

## Known Gaps

1. **Non-English translations for new keys**: The 77 new translation keys only have English values. The other 9 language blocks (zh, ko, ja, ru, de, fr, it, es, pt) fall back to English for these keys. This is acceptable per the brief ("If non-English landing copy remains older in some places, record that honestly in the result").
2. **TranslatePanel LANGUAGES constant**: The `LANGUAGES` array in `TranslatePanel` (source/target languages for translation) is still a separate hardcoded list, distinct from `SUPPORTED_UI_LANGUAGES`. This is correct by design — translation source/target language options are not the same thing as UI locale options.
3. **SystemPanel low-level labels**: Backend names, model IDs, capability names, metric labels, and node-control fields remain hardcoded English (out of scope per brief).
4. **HelpModal content**: The `HelpModal.tsx` component was not touched. Its help tab descriptions are already covered by `help.tabs.*` i18n keys.

## Remaining Validation

Validator (iMac-Debian) should:
1. Run both builds (`npm --prefix frontend run build`, `npm --prefix landing run build`)
2. Smoke landing at `?lng=es`, confirm selector shows Spanish, `document.documentElement.lang` is `es`
3. Check localStorage key `ihomenerd.ui.language` after language change
4. Open landing, change to `fr`, confirm `?lng=fr` appears in the Command Center URL when using the ScoutFlow connection path
5. Open Command Center directly with `?lng=fr`, confirm it initializes in French (tabs and shell labels)
6. Reload Command Center, confirm language persists
7. Confirm chat sends with the selected UI language value
8. Open Talk panel, confirm ASR/TTS controls still use BCP-47 language tags (not confused with UI locale)
9. Open Translate panel, confirm source/target translation controls are distinct from UI locale
10. Audit remaining English-only visible strings (outside Chat/Talk/Translate/System panels)
