# Result - Command Center Translation DE/IT/PT

- Verdict: **PASS** (with recorded out-of-scope gaps)
- Product commit: d742478a160d91cf8bc65b9bd3ccdd76bce242f8
- Implementation host: Acer-HL
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
each language. Namespaces covered: `chat.*`, `talk.*`, `trans.*`, `sys.*`.

## Placeholder / Pluralization Checks

**Placeholders:** All tested across de/it/pt in both files. Every instance of
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

Built JS bundles verified to contain de/it/pt translations in minified output.

## Smoke Notes

Smoke limited to build verification on Acer-HL (no browser runtime available
on this host). Bundle content audit confirms:

- German `chat.greeting` in bundle: `Hallo! Ich bin iHomeNerd, Ihr lokales KI-Gehirn.`
- Italian `chat.greeting` in bundle: `Ciao! Sono iHomeNerd, il tuo cervello IA locale.`
- Portuguese `chat.greeting` in bundle: `Olá! Eu sou o iHomeNerd, o seu cérebro local de IA.`

5/5 sampled phrases found in both frontend and landing bundles for each language.

Browser smoke (Chat, Talk, Translate, System panels in de/it/pt) is deferred
to the validation host (iMac-Debian).

## German Layout Pressure

No primary-control overflow concerns. The longest German strings are descriptive
paragraphs (sys.promoteNodeDesc at 247 chars, sys.sshNote at 207 chars) that are
also long in English and appear in roomy System panel sections.

Two keys exceed 40% length increase over English:
- `sys.noManagedNodes`: 137 EN → 204 DE (1.5x) — System panel descriptive text
- `inv_desc`: 48 EN → 69 DE (1.4x) — pre-existing key outside this sprint's additions

Neither creates control crowding. Tab labels, button texts, and status indicators
remain compact (tab_chat: "Chat" 4 chars, status_online: "Online" 6 chars,
sys.healthy: "Gesund" 6 chars).

Recommendation: acceptable; monitor during browser validation on iMac-Debian.

## Known Gaps

### Out of scope (not addressed, as per sprint brief)

1. **Non-target languages** (`zh`, `ko`, `ja`): still have the 111-key set and
   fall back to English for the 74 panel keys.
2. **ScoutFlow modal copy** (`landing/src/ScoutFlow.tsx`): hard-coded English.
3. **Landing-page narrative sections and setup cards**: hard-coded English.
4. **TranslatePanel source/target language option names** (`LANGUAGES` array):
   English-only.
5. **System low-level diagnostic values**: model IDs, backend names, capability
   IDs, hostnames, metric values — all API-derived, intentionally untranslated.
6. **No new language codes added**: SUPPORTED_UI_LANGUAGES unchanged.

### Deferred to browser smoke (validation host)

The following checks require a browser runtime and are deferred to iMac-Debian:
- `?lng=de`, `?lng=it`, `?lng=pt` initialization
- `document.documentElement.lang` confirmation
- Panel rendering (Chat, Talk, Translate, System) in target languages
- Language persistence and localStorage key `ihomenerd.ui.language`
- Language-role separation (chat language vs ASR/TTS vs Translate source/target)
- German primary-control visual fit

## Remaining Validation

Handoff to `validation/uniform-web-ui/command-center-translation-de-it-pt` on
`iMac-Debian`. The testing request at `testing/initiatives/uniform-web-ui/
2026-05-07_command-center-translation-de-it-pt/request.md` lists the full
validation checklist.

## Evidence

Build logs and audit output saved under:
`testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-de-it-pt/evidence/`
