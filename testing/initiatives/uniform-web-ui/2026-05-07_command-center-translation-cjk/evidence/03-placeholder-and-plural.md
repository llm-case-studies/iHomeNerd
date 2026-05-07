# Placeholder and Pluralization Audit

## Placeholders

All 5 placeholder types preserved exactly across zh/ko/ja in both frontend and landing:

| Placeholder | Used In | Preserved in zh | Preserved in ko | Preserved in ja |
|-------------|---------|-----------------|-----------------|-----------------|
| `{{route}}` | chat.capabilityInfo, trans.routeLabel | YES | YES | YES |
| `{{tier}}` | chat.capabilityInfo | YES | YES | YES |
| `{{language}}` | talk.recognizedWith | YES | YES | YES |
| `{{count}}` | 6 plural keys | YES | YES | YES |
| `{{year}}` | footer_rights | YES | YES | YES |

No interpolation markers lost, altered, or reordered in any language.

## Pluralization

All `_one` / `_other` pairs intact across all 10 languages:

| Base Key | _one | _other | zh | ko | ja |
|----------|------|--------|-----|-----|-----|
| talk.matchingVoices | PRESENT | PRESENT | YES | YES | YES |
| talk.localLanguages | PRESENT | PRESENT | YES | YES | YES |
| sys.nodesCount | PRESENT | PRESENT | YES | YES | YES |

All plural key pairs also verified present in landing i18n.ts.

## Stable Tokens

Product/technical tokens preserved untranslated in all CJK languages:
- `iHomeNerd`, `Nerd` (product name)
- `ASR`, `TTS`, `SSH` (protocol/runtime)
- `Docker`, `Ollama`, `launchd` (runtime names)
- `mac-mini`, `iMac` (hardware names)
- `Google Coral TPU` (hardware product name)

## Result: PASS
