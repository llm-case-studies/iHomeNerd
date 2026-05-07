# Bundle Smoke Verification - Command Center Translation DE/IT/PT

## Method

Sampled primary strings from Chat, Talk, Translate, and System panels in de, it, and pt
were searched in the minified production JS bundles of both the frontend app and landing page.

## Frontend Bundle (`backend/app/static/assets/index-DH7wVU18.js`)

| Key | de phrase | Found | it phrase | Found | pt phrase | Found |
|-----|-----------|-------|-----------|-------|-----------|-------|
| chat.greeting | Hallo! Ich bin iHomeNerd | YES | Ciao! Sono iHomeNerd | YES | Olá! Eu sou o iHomeNerd | YES |
| talk.listening | Höre zu | YES | In ascolto | YES | A ouvir | YES |
| talk.transcribing | Transkribiere lokal | YES | Trascrizione locale in corso | YES | A transcrever localmente | YES |
| trans.translating | Übersetze | YES | Traduzione in corso | YES | A traduzir | YES |
| sys.loading | Lade Systemstatus | YES | Caricamento stato del sistema | YES | A carregar estado do sistema | YES |
| sys.healthy | Gesund | YES | - | - | - | - |
| trans_title | Lokale Übersetzung | YES | - | - | - | - |
| talk_title | Lokaler Sprachassistent | YES | - | - | - | - |

## Landing Bundle (`landing/dist/assets/index-9prglZtj.js`)

| de phrase | Found | it phrase | Found | pt phrase | Found |
|-----------|-------|-----------|-------|-----------|-------|
| Hallo! Ich bin iHomeNerd | YES | Ciao! Sono iHomeNerd | YES | Olá! Eu sou o iHomeNerd | YES |
| Höre zu | YES | In ascolto | YES | A ouvir | YES |
| Transkribiere lokal | YES | Trascrizione locale in corso | YES | A transcrever localmente | YES |
| Lade Systemstatus | YES | Caricamento stato del sistema | YES | A carregar estado do sistema | YES |

## Notes

- All sampled phrases confirmed present in both frontend and landing production bundles
- No English fallback strings found for the scoped keys in de/it/pt bundles
- Bundles contain the full i18n resource objects with de/it/pt translations

Verdict: PASS (build-level verification; browser runtime smoke deferred to host with display)

## Browser Smoke Deferred

Browser-level smoke checks (?lng=de, ?lng=it, ?lng=pt initialization, panel rendering,
document.documentElement.lang, localStorage) require a host with display access.
This validation was performed on a headless environment (build verification only).
