# Example Sprint Pack: Android Model Catalog

This is the second reference sprint pack for expert-agent work.

It keeps the same pattern as the first sprint:

1. create a real feature branch off `origin/main`
2. write a brief that names host, branch, and merge target
3. point the implementer to existing platform docs
4. require the implementer to leave a testing request behind
5. require build/deploy smoke before testing handoff
6. merge only after validation

## Sprint topic

`feature/android-model-catalog`

Goal:

- make the Android runtime report its local model inventory honestly
- align the Android `Models` tab with a real runtime-facing catalog
- expose which packs are loaded, loadable, experimental, or currently backing
  capabilities
- move Android one step closer to the desktop / iPhone local-model story

## Files in this pack

- `01-brief.md` — what the coding agent should do
- `02-result-template.md` — how the coding agent reports back
- `03-merge-note-template.md` — how the owner records promotion/hold

The validator request for this sprint lives in:

- `mobile/testing/requests/ANDROID_MODEL_CATALOG_TEST_REQUEST_2026-05-02.md`
