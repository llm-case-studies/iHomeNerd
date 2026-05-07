# Result - Command Center Translation Pilot

- Verdict: **PASS** (with recorded out-of-scope gaps)
- Product commit: TBD (fill after push)
- Implementation host: Acer-HL
- Smoke host: Acer-HL (build-only, no browser)

## What Changed

- `frontend/src/lib/i18n.ts`: added 74 Command Center resource keys to the
  `es`, `fr`, and `ru` translation blocks, bringing each to full 185-key parity
  with English.
- `landing/src/i18n.ts`: mirrored the same 74-key insertions to keep landing
  and Command Center resource blocks aligned.

## Pilot Language Coverage

| Language | Keys before | Keys after | Missing from en |
|----------|------------|------------|-----------------|
| es       | 111        | 185        | 0               |
| fr       | 111        | 185        | 0               |
| ru       | 111        | 185        | 0               |

All 74 previously-fallback keys now have reviewed first-pass translations in
each pilot language. Namespaces covered: `chat.*`, `talk.*`, `trans.*`, `sys.*`.

## Placeholder / Pluralization Checks

**Placeholders:** All tested across es/fr/ru in both files. Every instance of
`{{route}}`, `{{tier}}`, `{{language}}`, and `{{count}}` is preserved exactly.
No interpolation markers were lost, altered, or reordered.

**Pluralization:** All `_one` / `_other` pairs present and intact:
- `talk.matchingVoices`
- `talk.localLanguages`
- `sys.nodesCount`

**Stable tokens:** `iHomeNerd`, `Nerd`, `ASR`, `TTS`, `SSH`, `Docker`, `Ollama`,
`launchd`, `mac-mini`, `iMac` are preserved untranslated.

## Builds / Tests

```bash
npm --prefix frontend run build   # PASS - vite build, 0 errors
npm --prefix landing run build    # PASS - vite build, 0 errors
python3 tools/branch-map/branch_map.py --repo . --base origin/main  # PASS
```

Built JS bundles verified to contain es/fr/ru translations in minified output.

## Smoke Notes

Smoke limited to build verification on Acer-HL (no browser runtime available
on this host). Bundle content audit confirms:

- Spanish `chat.greeting` in bundle: `¡Hola! Soy iHomeNerd, tu cerebro local de IA.`
- French `chat.greeting` in bundle: `Bonjour ! Je suis iHomeNerd, votre cerveau IA local.`
- Russian `chat.greeting` in bundle: `Здравствуйте! Я iHomeNerd, ваш локальный ИИ-мозг.`

Browser smoke (Chat, Talk, Translate, System panels in es/fr/ru) is deferred
to the validation host (iMac-Debian).

## Known Gaps

### Out of scope (not addressed, as per sprint brief)

1. **Non-pilot languages** (`zh`, `ko`, `ja`, `de`, `it`, `pt`): still have
   the 111-key set and fall back to English for the 74 panel keys.
2. **ScoutFlow modal copy** (`landing/src/ScoutFlow.tsx`): hard-coded English.
3. **Landing-page narrative sections and setup cards**: hard-coded English.
4. **TranslatePanel source/target language option names** (`LANGUAGES` array):
   English-only.
5. **System low-level diagnostic values**: model IDs, backend names, capability
   IDs, hostnames, metric values — all API-derived, intentionally untranslated.
6. **No new language codes added**: SUPPORTED_UI_LANGUAGES unchanged.

### Deferred to browser smoke (validation host)

The following checks require a browser runtime and are deferred to iMac-Debian:
- `?lng=es`, `?lng=fr`, `?lng=ru` initialization
- `document.documentElement.lang` confirmation
- Panel rendering (Chat, Talk, Translate, System) in pilot languages
- Language persistence and localStorage key `ihomenerd.ui.language`
- Language-role separation (chat language vs ASR/TTS vs Translate source/target)

## Remaining Validation

Handoff to `validation/uniform-web-ui/command-center-translation-pilot` on
`iMac-Debian`. The testing request at `testing/initiatives/uniform-web-ui/
2026-05-07_command-center-translation-pilot/request.md` lists the full
validation checklist.
