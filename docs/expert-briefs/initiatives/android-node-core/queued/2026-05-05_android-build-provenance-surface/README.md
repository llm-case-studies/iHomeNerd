# Queued Sprint: Android Build Provenance Surface

**Status:** ready to cut into a coding/testing sprint  
**Initiative:** `android-node-core`

## Why this is ready

We already proved that different Android devices can appear to be on the “same”
app version while actually carrying different assets and capabilities.

What caused the confusion:

- same `0.1.0-dev-android` version label
- different bundled frontend assets
- different ASR prerequisite state
- different worktrees/build roots used historically

We now have a canonical APK workflow, so the next core improvement is obvious:

> expose build and asset provenance directly in runtime surfaces such as
> `/health` and `/system/stats`

## Candidate acceptance

- expose build commit or revision identifier
- expose whether bundled web assets are present
- expose whether major local prerequisites are present (`ASR` cache/models)
- expose enough information that testers can distinguish “same APK baseline”
  from “same semantic version only”

## Why this belongs in core

This is a platform observability problem, not an app-specific feature.
