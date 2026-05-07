# Uniform Web UI

## Goal

Serve one canonical Command Center SPA from every node that can host it:
backend, iOS, Android, Mac, and future SBC nodes.

The SPA source remains `frontend/`. Built assets are distributed to node
runtimes as derived artifacts, not rewritten per platform.

## Philosophy

The menu is shared. The lab is platform-specific.

- **Menu:** user-facing commands and panels that should behave consistently on
  every node.
- **Lab:** platform-native diagnostics, experiments, and hardware-specific
  surfaces that should not pollute the shared menu.

This initiative exists to make that split real in code.

## Current Active Sprints

- `active/2026-05-04_speech-extraction-plugin-namespace/` — first implementation follow-up from the completed client-surface panel; extracts core speech routes, adds plugin namespace, and splits `/capabilities`
- `active/2026-05-03_frontend-model-selector/` — SPA consumer of `/v1/models` + `/v1/models/load`
- `active/2026-05-03_ios-uniform-web-serving/` — iOS serves the bundled Command Center
- `active/2026-05-03_ios-chat-contract-unification/` — iOS `/v1/chat` mirrors backend cleanup `4e9aa7b` (canonical superset shape)

## Completed Discussion Sprints

- `active/2026-05-04_client-surface-boundary-review/` — complete on `main`; produced the boundary model and the first coding recommendation

## Promoted Implementation Sprints

- `active/2026-05-07_command-center-translation-pilot/` — promoted to `main`
  on 2026-05-07; adds first-pass Spanish, French, and Russian translations for
  scoped Command Center panel keys
- `active/2026-05-07_command-center-language-parity/` — promoted to `main` on
  2026-05-07; left an intentional follow-up gap for non-English translations of
  the newly keyed Command Center panel strings

## Foundation Doc

- `docs/ARCHITECTURE_NODE_PARITY.md` — the menu vs. lab framing in full, plus the why-ladder, demand catalog, capability anatomy, honest-advertisement principle, and per-platform state matrix. The new sprints under `active/` cite this as their fence.

## References

- `docs/expert-briefs/reference/2026-05-02_android-uniform-web-serving/`
- `docs/expert-briefs/reference/2026-05-02_android-model-catalog/`
