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

- `active/2026-05-03_frontend-model-selector/`
- `active/2026-05-03_ios-uniform-web-serving/`

## References

- `docs/expert-briefs/reference/2026-05-02_android-uniform-web-serving/`
- `docs/expert-briefs/reference/2026-05-02_android-model-catalog/`

