# Uniform Web UI Sprint Index

| Sprint | Status | Branch | Implementation Host | Build Host | Validation | Notes |
|---|---|---|---|---|---|---|
| `2026-05-07_command-center-language-parity` | active | `feature/uniform-web-ui/command-center-language-parity` | `Acer-HL` | any Node/Vite host | `iMac-Debian` / `validation/uniform-web-ui/command-center-language-parity` | Align landing and Command Center language behavior: shared options, `?lng=` handoff, persistence, document language, and visible hard-coded English cleanup. |
| `2026-05-04_speech-extraction-plugin-namespace` | active | `feature/uniform-web-ui/speech-extraction-plugin-namespace` | `Acer-HL` | `Acer-HL` or any Python-capable host | `iMac-Debian` / `wip/testing` | First coding follow-up from the client-surface panel. Extract speech routes from `plugins/pronunco.py`, move PronunCo routes under `/v1/plugins/pronunco/...`, split `/capabilities`, and remove the redundant flat image-extract stub. |
| `2026-05-03_frontend-model-selector` | implemented | `feature/uniform-web-ui/frontend-model-selector` | `Acer-HL` | any Node/Vite host | `iMac-Debian` / `wip/testing` | Adds SPA consumer for `/v1/models` and `/v1/models/load`. DeepSeek delivered `3b62b9f`. |
| `2026-05-03_ios-chat-contract-unification` | active | `feature/uniform-web-ui/ios-chat-contract-unification` | `Acer-HL` or Swift-aware host | `mac-mini` | `iMac-Debian` / `wip/testing` | iOS `/v1/chat` accepts both `{prompt}` and `{messages}`, returns canonical response superset. |
| `2026-05-03_ios-uniform-web-serving` | active | `feature/uniform-web-ui/ios-uniform-web-serving` | `Acer-HL` or Swift-aware host | `mac-mini` | `iMac-Debian` / `wip/testing` | iOS serves bundled Command Center assets honestly. |

## Queued Follow-Ups

- `PronunCo namespace adoption` — cross-repo follow-up once the iHN route move lands; the right canary client for adapter pain.
- `Capabilities tiering polish / route inventory audit` — second iHN cleanup once Sprint 1 stabilizes.
- `Second client pressure test` — `iMedisys` or `iLegalFlow`, still TBD, to challenge docs/rules boundaries outside language coaching.
- `Dialogue primitive extraction` — explicitly conditional on Sprint 1 proving a clean reusable seam.

## Dependency Notes

- `frontend-model-selector` can be built and tested against the backend first.
- `ios-uniform-web-serving` should support bundled-assets-present and
  bundled-assets-missing states.
- iPhone browser validation benefits from both sprints landing, but neither
  should be allowed to grow into the other.
- `speech-extraction-plugin-namespace` is the first implementation follow-up to
  the completed client-surface boundary discussion sprint. It should stay
  mechanical and boundary-oriented rather than reopening the whole architecture
  debate in code.
- `command-center-language-parity` should keep UI locale, chat language, ASR
  language, TTS voice language, and Translate source/target language distinct.
