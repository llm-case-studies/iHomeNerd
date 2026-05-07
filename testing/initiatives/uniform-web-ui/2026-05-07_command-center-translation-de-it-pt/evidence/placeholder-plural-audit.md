# Placeholder & Pluralization Audit - Command Center Translation DE/IT/PT

## Placeholder Preservation

Verified in both `frontend/src/lib/i18n.ts` and `landing/src/i18n.ts`.

| Placeholder | Keys containing it | de | it | pt |
|-------------|-------------------|-----|-----|-----|
| `{{route}}` | chat.capabilityInfo, trans.routeLabel | PRESERVED | PRESERVED | PRESERVED |
| `{{tier}}` | chat.capabilityInfo | PRESERVED | PRESERVED | PRESERVED |
| `{{language}}` | talk.recognizedWith | PRESERVED | PRESERVED | PRESERVED |
| `{{count}}` | talk.matchingVoices_one/other, talk.localLanguages_one/other, sys.nodesCount_one/other | PRESERVED | PRESERVED | PRESERVED |
| `{{year}}` | footer_rights | PRESERVED | PRESERVED | PRESERVED |

All placeholders are preserved exactly across de, it, and pt in both files.
No interpolation markers were lost, altered, reordered, or added.

Verdict: PASS

## Pluralization Pair Integrity

Three _one/_other plural key pairs exist in English:

| Base Key | _one | _other |
|----------|------|--------|
| talk.matchingVoices | {{count}} matching voice | {{count}} matching voices |
| talk.localLanguages | {{count}} local language | {{count}} local languages |
| sys.nodesCount | {{count}} node | {{count}} nodes |

All three pairs are present and intact in de, it, and pt in both frontend and landing files.

Verdict: PASS

## Stable Token Preservation

Product/technical tokens confirmed untranslated across de/it/pt:

- `iHomeNerd`, `Nerd`
- `ASR`, `TTS`, `SSH`
- `Docker`, `Ollama`
- `launchd`
- `mac-mini`, `iMac`
- Route names, model IDs, capability IDs (API-derived, not in translation resources)

Verdict: PASS
