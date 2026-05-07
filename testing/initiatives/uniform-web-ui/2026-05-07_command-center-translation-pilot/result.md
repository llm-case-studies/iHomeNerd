# Result - Command Center Translation Pilot

- Verdict: **PASS** (with recorded out-of-scope gaps)
- Product commit under test: e8b5a24 (branch HEAD)
- Code-changing commit: 87f7fb16c3ad65a2da3cbccb6a200474eb4544d9
- Implementation host: Acer-HL
- Validation host: iMac-Debian
- Validator branch: `validation/uniform-web-ui/command-center-translation-pilot`

## What Changed

- `frontend/src/lib/i18n.ts`: added 74 Command Center resource keys to the
  `es`, `fr`, and `ru` translation blocks, bringing each to full 185-key parity
  with English.
- `landing/src/i18n.ts`: mirrored the same 74-key insertions to keep landing
  and Command Center resource blocks aligned.

## Pilot Language Coverage (Validation Audit)

Computational audit via Python line-based parser on both i18n source files.

| Language | Total Keys | Scoped CC Keys | Missing from en |
|----------|-----------|----------------|-----------------|
| en       | 185       | 112            | 0               |
| es       | 185       | 112            | 0               |
| fr       | 185       | 112            | 0               |
| ru       | 185       | 112            | 0               |
| zh       | 111       | ~68            | ~44             |
| ko       | 111       | ~68            | ~44             |
| ja       | 111       | ~68            | ~44             |
| de       | 111       | ~68            | ~44             |
| it       | 111       | ~68            | ~44             |
| pt       | 111       | ~68            | ~44             |

Note: The "185" reported in the implementation result.md is the **total** key count
(including landing-page keys like hw_*, hero_*, nav_*, etc.), not the Command Center
scoped key count. The scoped CC keys count is 112. Audit confirms es/fr/ru match en
exactly: 185 total, 112 scoped, 0 missing.

## Placeholder / Pluralization Checks

**Placeholders:** All checked across es/fr/ru in frontend i18n. Every instance of
`{{route}}`, `{{tier}}`, `{{language}}`, `{{count}}`, and `{{year}}` is preserved
exactly. No interpolation markers were lost, altered, or reordered.

Keys audited:
- `chat.capabilityInfo` ({{route}}, {{tier}})
- `talk.recognizedWith` ({{language}})
- `talk.matchingVoices_one/_other` ({{count}})
- `talk.localLanguages_one/_other` ({{count}})
- `sys.nodesCount_one/_other` ({{count}})
- `trans.routeLabel` ({{route}})
- `footer_rights` ({{year}})

**Same-as-English values:** All acceptable stable tokens:
- es: app_title (`iHomeNerd`), tab_chat (`Chat`), tab_docs (`Docs`), talk.autoVoice (`Auto`), talk.labelNerd (`Nerd:`)
- fr: app_title, tab_agents (`Agents`), tab_chat, tab_docs, talk.autoVoice
- ru: app_title, talk.labelNerd

**Pluralization:** All `_one` / `_other` pairs present and intact in all pilot
languages:
- `talk.matchingVoices` (voz/voces, voix, голос/голосов)
- `talk.localLanguages` (idioma/idiomas, langue/langues, язык/языков)
- `sys.nodesCount` (nodo/nodos, nœud/nœuds, узел/узлов)

`{{count}}` placeholder present in all plural forms.

## Builds / BranchMap

```bash
npm --prefix frontend run build   # PASS - vite build, 0 errors, 2129 modules
npm --prefix landing run build    # PASS - vite build, 0 errors, 1710 modules
python3 tools/branch-map/branch_map.py --repo . --base origin/main  # PASS
```

BranchMap shows feature branch `feature/uniform-web-ui/command-center-translation-pilot`:
+4 ahead of origin/main, no warnings.

## Language Separation Audit

**document.documentElement.lang:**
- Set via `setDocumentLang(code)` in `languageUtils.ts` → `document.documentElement.lang = code`
- Called from `persistLanguage()` on every language change event
- `resolveInitialLanguage()` reads `?lng=` URL param first, then localStorage
- Landing uses identical mechanism with same STORAGE_KEY

**localStorage key `ihomenerd.ui.language`:**
- Defined as `STORAGE_KEY` in both `frontend/src/lib/languageUtils.ts:4` and `landing/src/lib/languageUtils.ts:4`
- Set on language change via `persistLanguage()` → `window.localStorage.setItem(STORAGE_KEY, code)`
- Verified in production JS bundle: key string present

**Chat language (i18n.language):**
- `ChatPanel.tsx:56`: `api.chat(apiMessages, null, i18n.language)` — passes UI language as chat language parameter

**Talk ASR/TTS BCP-47 tags:**
- `TTS_LANG_MAP` maps UI codes to BCP-47: `es`→`es-ES`, `fr`→`fr-FR`, `ru`→`ru-RU`
- `selectedAsrLanguage` state — separate from UI locale
- `voice.languageTag` — BCP-47 tags from TTS backend per voice
- Recognition language selector is an independent control

**Translate source/target controls:**
- `TranslatePanel.tsx:23-24`: `sourceLang` and `targetLang` are separate React states
- Not derived from `i18n.language` — independent controls

**SUPPORTED_UI_LANGUAGES:** Unchanged at 10 languages. No new codes added.

## Bundle Smoke (Headless)

Host is headless (no browser runtime). Verified in production JS bundle:

- Spanish `chat.greeting`: `¡Hola! Soy iHomeNerd` — **present**
- French `chat.greeting`: `Bonjour` / `Je suis iHomeNerd` / `votre cerveau IA local` — **present**
- Russian `chat.greeting`: `Здравствуйте! Я iHomeNerd` — **present**
- `chat.greeting` key appears 5 times in bundle (all language maps)
- `talk.listening`, `trans.placeholder`, `sys.loading` each appear 5 times
- Primary strings for Chat, Talk, Translate, System verified in bundle for es/fr/ru

Dev server smoke:
- Started Vite dev server; HTML template has hardcoded `lang="en"` (expected)
- Language switching happens client-side via `resolveInitialLanguage()` reading `?lng=` param
- Full interactive browser panel smoke (Chat/Talk/Translate/System with actual ?lng=es/fr/ru
  rendering) deferred to runtime environment with a browser

## Known Gaps

### Out of scope (recorded, not failures)

1. **Non-pilot languages** (`zh`, `ko`, `ja`, `de`, `it`, `pt`): 111 keys each,
   ~44 scoped CC keys fall back to English.
2. **ScoutFlow modal copy** (`landing/src/ScoutFlow.tsx`): hard-coded English.
3. **Landing-page narrative sections and setup cards**: hard-coded English.
4. **TranslatePanel source/target language option names** (`LANGUAGES` array):
   English-only display names (Auto Detect, English, Spanish, French, German,
   Chinese, Japanese).
5. **System low-level diagnostic values**: model IDs, backend names, capability
   IDs, hostnames, metric values — API-derived, intentionally untranslated.
6. **No new language codes added**: SUPPORTED_UI_LANGUAGES unchanged.
7. **Interactive browser panel smoke**: deferred (headless validation host).

## Evidence

Saved under:
`testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-pilot/evidence/`

- `key_coverage_audit.txt` — full key count and coverage analysis
- `placeholder_audit.txt` — placeholder preservation across es/fr/ru
- `pluralization_audit.txt` — _one/_other pair integrity check
- `build_logs.txt` — frontend, landing, and BranchMap output
- `language_separation_audit.txt` — documentElement.lang, localStorage, Chat/Talk/Translate separation
- `bundle_smoke.txt` — production JS bundle string verification
- `out_of_scope_gaps.txt` — complete gap inventory
