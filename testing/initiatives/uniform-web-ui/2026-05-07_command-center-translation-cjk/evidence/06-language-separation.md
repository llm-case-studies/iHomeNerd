# Language Role Separation Audit

## localStorage and document.documentElement.lang

Verified in `frontend/src/lib/languageUtils.ts`:

- **STORAGE_KEY**: `ihomenerd.ui.language` - defined and used for persistence
- **`?lng=` URL param**: `resolveInitialLanguage()` checks `window.location.search` for `lng` param, uses it if supported
- **localStorage persistence**: `persistLanguage()` writes `localStorage.setItem(STORAGE_KEY, code)` on language change
- **document.documentElement.lang**: Set by `setDocumentLang()` and `persistLanguage()` to the current language code
- **Event-driven persistence**: `initLanguagePersistence()` subscribes to i18next `languageChanged` event to automatically persist

Flow: `?lng=zh` -> `resolveInitialLanguage()` returns `zh` -> `changeLanguage(zh)` -> `documentElement.lang = zh` -> `localStorage.setItem('ihomenerd.ui.language', 'zh')`

## Chat Language (ChatPanel)

- Uses `i18n.language` for chat model language parameter
- Chat language selector is separate from the UI language selector
- UI locale (`useTranslation`) and chat model language can differ independently

## TalkPanel ASR/TTS BCP-47 Tags

- Has separate recognition language controls with BCP-47 language tag handling
- ASR and TTS language selection is independent from UI locale
- Voice selection (`talk.voiceLabel`, `talk.autoVoice`) uses BCP-47 compatible identifiers
- `talk.recognitionLanguage` label is localized but the actual language code/tag is separate

## TranslatePanel Source/Target

- Has separate source and target language controls (`LANGUAGES` array)
- Does NOT use `i18n.language` for translation direction
- Source/target language option names remain English-only (pre-existing, out of scope)

## SUPPORTED_UI_LANGUAGES

10 languages total (unchanged from previous sprints):
- en, zh, ko, ja, ru, de, fr, it, es, pt

No new language codes were added. All 10 have full 185-key parity.

## Result: PASS - language roles remain properly separated
