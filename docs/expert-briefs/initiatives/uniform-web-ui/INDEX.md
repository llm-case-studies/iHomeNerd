# Uniform Web UI Sprint Index

| Sprint | Status | Branch | Implementation Host | Build Host | Validation | Notes |
|---|---|---|---|---|---|---|
| `2026-05-03_frontend-model-selector` | implemented | `feature/uniform-web-ui/frontend-model-selector` | `Acer-HL` | any Node/Vite host | `iMac-Debian` / `wip/testing` | Adds SPA consumer for `/v1/models` and `/v1/models/load`. DeepSeek delivered `3b62b9f`. |
| `2026-05-03_ios-chat-contract-unification` | active | `feature/uniform-web-ui/ios-chat-contract-unification` | `Acer-HL` or Swift-aware host | `mac-mini` | `iMac-Debian` / `wip/testing` | iOS `/v1/chat` accepts both `{prompt}` and `{messages}`, returns canonical response superset. |
| `2026-05-03_ios-uniform-web-serving` | active | `feature/uniform-web-ui/ios-uniform-web-serving` | `Acer-HL` or Swift-aware host | `mac-mini` | `iMac-Debian` / `wip/testing` | iOS serves bundled Command Center assets honestly. |

## Dependency Notes

- `frontend-model-selector` can be built and tested against the backend first.
- `ios-uniform-web-serving` should support bundled-assets-present and
  bundled-assets-missing states.
- iPhone browser validation benefits from both sprints landing, but neither
  should be allowed to grow into the other.

