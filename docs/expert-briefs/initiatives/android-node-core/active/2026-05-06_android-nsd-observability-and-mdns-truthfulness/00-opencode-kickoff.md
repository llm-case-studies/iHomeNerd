You are implementing the next sprint in the `android-node-core` initiative.

Repo:
- `/home/alex/Projects/iHomeNerd-coding`

Branch:
- `feature/android-node-core/nsd-observability-and-mdns-truthfulness`

Read first:
- `docs/expert-briefs/README.md`
- `docs/expert-briefs/initiatives/android-node-core/README.md`
- `docs/expert-briefs/initiatives/android-node-core/INDEX.md`
- `docs/expert-briefs/initiatives/android-node-core/active/2026-05-06_android-nsd-observability-and-mdns-truthfulness/README.md`
- `docs/expert-briefs/initiatives/android-node-core/active/2026-05-06_android-nsd-observability-and-mdns-truthfulness/01-brief.md`
- `testing/initiatives/android-node-core/2026-05-06_android-nsd-observability-and-mdns-truthfulness/request.md`

Your fence:
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/AndroidServiceAdvertiser.kt`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalNodeRuntime.kt`
- `testing/initiatives/android-node-core/2026-05-06_android-nsd-observability-and-mdns-truthfulness/result.md`
- `testing/initiatives/android-node-core/2026-05-06_android-nsd-observability-and-mdns-truthfulness/request.md`, only if implementation reveals extra validation cases

Goal:
1. Surface Android NSD/mDNS registration truth in runtime JSON.
2. Make it possible to tell whether registration was attempted, succeeded, failed, or later stopped.
3. Keep the scope to operational truthfulness, not speculative discovery redesign.

Before handoff:
1. Orchestrate Android build/deploy smoke on `iMac-macOS`.
2. Validate the new NSD fields on at least one real device.
3. Fill `testing/initiatives/android-node-core/2026-05-06_android-nsd-observability-and-mdns-truthfulness/result.md`.
4. Commit and push the branch.

When done, stop after summarizing:
- what changed
- files touched
- smoke status
- what still needs validation

