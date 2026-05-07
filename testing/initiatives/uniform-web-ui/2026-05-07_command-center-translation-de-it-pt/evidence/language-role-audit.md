# Language Role Separation Audit - Command Center Translation DE/IT/PT

## Summary

Verified that UI locale, chat language, ASR/TTS language tags, and Translate
source/target controls remain distinct and do not interfere with each other.

## 1. UI Locale Resolution (`frontend/src/lib/languageUtils.ts`)

- Reads `?lng=` URL parameter first (highest priority)
- Falls back to `localStorage.getItem('ihomenerd.ui.language')`
- Falls back to `DEFAULT_UI_LANGUAGE` ('en')
- Sets `document.documentElement.lang = code` on language change
- Persists to `localStorage.setItem('ihomenerd.ui.language', code)`

Verdict: PASS - document.documentElement.lang and localStorage behaviors confirmed via code audit

## 2. Supported UI Languages (`frontend/src/lib/languages.ts`)

de, it, pt are all in `SUPPORTED_UI_LANGUAGES`:
- `{ code: 'de', label: 'Deutsch (German)', nativeLabel: 'Deutsch' }`
- `{ code: 'it', label: 'Italiano (Italian)', nativeLabel: 'Italiano' }`
- `{ code: 'pt', label: 'Português (Brasil)', nativeLabel: 'Português' }`

Verdict: PASS - de, it, pt are registered as supported UI languages

## 3. Chat Language (`frontend/src/components/ChatPanel.tsx`)

- Chat sends `i18n.language` as a separate `language` field in the API request body
- This is protocol-level separation from other language roles
- Chat language is implicitly bound to UI locale (no independent chat-language selector exists)
- This is a design choice, not a regression from this sprint

Verdict: PASS - Chat language is sent as a distinct API parameter, separate from ASR/TTS tags and Translate controls

## 4. Talk ASR/TTS Languages (`frontend/src/components/TalkPanel.tsx`)

- TTS uses a `TTS_LANG_MAP` that converts i18n short codes to BCP-47 tags:
  - de -> de-DE, it -> it-IT, pt -> pt-BR
- ASR language is populated from backend ASR capability metadata as BCP-47 tags
- User can independently select ASR language from a dropdown
- Both `language` (ASR) and `ttsLang` (TTS) are sent as separate BCP-47 tagged parameters
- Neither is affected by UI locale changes beyond the TTS_LANG_MAP initial derivation

Verdict: PASS - ASR/TTS use BCP-47 tags, independent from UI locale controls

## 5. Translate Source/Target (`frontend/src/components/TranslatePanel.tsx`)

- `sourceLang` and `targetLang` are independent React state variables
- Not tied to `i18n.language` in any way
- Default values: `'auto'` for source, `'es'` for target (hardcoded)
- Passed directly to `api.translate(sourceText, sourceLang, targetLang)`
- Note: The dropdown option *labels* (language names) are hardcoded English in the `LANGUAGES` array - this is a known out-of-scope gap

Verdict: PASS - Translate source/target selection remains independent of UI locale

## 6. No New Language Codes Added

`SUPPORTED_UI_LANGUAGES` array is unchanged from the previous sprint.
No new language codes were added. Only translations for existing codes were expanded.

Verdict: PASS - No language plumbing changes
