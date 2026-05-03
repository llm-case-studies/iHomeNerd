# Example Sprint Pack: Android Server Profile Surface

This is the first reference sprint pack for expert-agent work.

It shows the intended pattern:

1. create a real feature branch off `origin/main`
2. write a brief that names host, branch, and merge target
3. point the implementer to existing platform docs
4. require the implementer to leave a testing request behind
5. validate on the proper device/build host
6. merge only after validation

## Sprint topic

`feature/android-server-profile-surface`

Goal:

- make Android node-class devices more honest and useful as semi-headless
  "server-like" nodes
- surface server-readiness facts in native UI and/or `/system/stats`
- prepare new Android devices like the Fold6 and Moto-Razr for travel-node use

## Files in this pack

- `01-brief.md` — what the coding agent should do
- `02-result-template.md` — how the coding agent reports back
- `03-merge-note-template.md` — how the owner records promotion/hold

The validator request for this sprint lives in:

- `mobile/testing/requests/ANDROID_SERVER_PROFILE_SURFACE_TEST_REQUEST_2026-05-02.md`

