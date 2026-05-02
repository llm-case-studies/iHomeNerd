# Kimi K2.6 Assignment — MLX Model-Switch Crash Fix

**Date issued:** 2026-05-01
**Issued by:** Claude Opus 4.7 (Mac mini / iHomeNerd workspace)
**Target copilot:** Kimi K2.6 (Moonshot AI, free chat tier)
**Repo branch context:** `feature/mlx-llm-engine` at `91a66c3` or later
**Estimated work:** one focused session, ≤30 minutes of code edits + verification

---

## 0. Why you (and the leash that comes with it)

You're the first model from the BugWitness review panel we've handed a real iHomeNerd fix to. We're picking you because your Round 1 review showed strength in agent-loop authoring, cold-start baselines, and dual-view artifacts — i.e. you reason about the *runtime lifecycle*, which is exactly what's broken here.

We have a working pattern for this kind of handoff that **only fails when the copilot widens scope without being asked**. So before anything else: please read §1 hard fence, §6 stop conditions, and §7 PR template. If any of those feel wrong, push back in the PR description rather than silently expanding scope.

---

## 1. Hard fence

**Edit-allowed (the only file you may modify):**
- `mobile/ios/ihn-home/IhnHome/Runtime/MLXEngine.swift`

**Read-only (use them to understand context, do not edit):**
- `mobile/ios/ihn-home/IhnHome/Screens/ModelsScreen.swift` (the caller — invokes `loadFromHub` on tap)
- `mobile/ios/ihn-home/IhnHome/Screens/ChatScreen.swift` (the second caller — reads `loadedModelName()`)
- `mobile/ios/ihn-home/IhnHome/Runtime/HuggingFaceMLXBridge.swift` (the downloader/tokenizer types `MLXEngine` depends on)
- `mobile/ios/ihn-home/IhnHome/Runtime/CapabilityHost.swift` (uses `getLoadedModelName()` nonisolated probe)

**Do not:**
- Touch any file outside the edit-allowed list above.
- Add tests, docs, comments-for-the-sake-of-comments, or refactor unrelated code paths.
- Rename anything, including the `Result` struct or its fields.
- Change the public actor surface (`loadModel`, `loadFromHub`, `loadedModelName`, `generate`, `getLoadedModelName`). Their signatures are consumed by callers we are not allowed to edit in this assignment.
- Add a new dependency. The MLX-Swift API surface available is whatever's already imported (`MLXLLM`, `MLXLMCommon`).

---

## 2. Goal in one sentence

When the user already has one MLX model loaded and taps "Switch Model" in the Models tab to load a different one, the app must release the prior model first and load the new one without crashing.

---

## 3. The bug

Repro (verified on iPhone 12 Pro Max, 6 GB nominal RAM):
1. Launch the app on a real device with `feature/mlx-llm-engine` build installed.
2. Open the **Models** tab.
3. Tap "Download & Load" on **Qwen 2.5 Instruct**. Wait for "Loaded" status.
4. Tap "Switch Model" on **Gemma 4 E2B Instruct**.
5. App crashes during the second load.

Direct cause (read the current source before agreeing): `loadFromHub` in `MLXEngine.swift` overwrites `self.modelContainer` with a new `ModelContainer` while the old container still holds GPU memory and tokenizer state. On a 6 GB device, the simultaneous footprint of two 4-bit quantized models exceeds available memory, and either MLX or the OS kills the app.

The fix needs to release the prior model **before** initiating the new download/load — and the release has to be observable enough that MLX has actually let go of the GPU buffers, not just nilled the Swift reference.

---

## 4. The contract you must keep

Existing actor state in `MLXEngine`:
```swift
private var isLoaded = false
private var modelName: String?
private var modelContainer: ModelContainer?
private let downloader = MLXHuggingFaceHubDownloader()
private let tokenizerLoader = MLXHuggingFaceTokenizerLoader()
```

Existing public surface (do not change signatures):
```swift
func loadModel(name: String, path: URL) async throws
func loadFromHub(configuration: ModelConfiguration) async throws
func loadedModelName() -> String?
func generate(prompt: String) async throws -> Result
nonisolated func getLoadedModelName() -> String?
```

Both `loadModel` and `loadFromHub` need the same fix — they share the same overwrite-without-release pattern. Apply the fix to both. Don't refactor them into a single helper; just fix each in place. (Premature abstraction risk; we'll consolidate later if a third loader appears.)

`enforceMemoryBudget(for:)` already runs at the top of both load paths. Leave it where it is. The unload must happen *after* the budget check passes, so we don't release a working model only to discover we couldn't load the new one.

---

## 5. What "fixed" looks like

After the user taps "Switch Model" from Qwen → Gemma on iPhone 12 Pro Max:

1. The app does not crash.
2. The "Loaded" status moves from Qwen to Gemma.
3. A subsequent `/v1/chat` call against `https://192.168.0.220:17777/v1/chat` returns 200 with `model: "mlx-community/gemma-4-e2b-it-4bit"` and a non-empty `text` field.
4. App memory (visible via `GET /system/stats` `app_memory_pss_bytes`) is in the same ballpark as a fresh Gemma load — not roughly the sum of Qwen + Gemma.

If the second load fails for a reason that is *not* the double-load crash (e.g. network down, memory budget rejects the new model), the prior model must remain loaded. In other words: a failed switch should not strand the user with no model loaded. This is the load-then-swap pattern.

Translate that into code as: cache the new container into a local before assigning it to `self.modelContainer`, only overwrite once the new load has succeeded, then release the old one. If the new load throws, propagate the error and leave `self.modelContainer` / `self.modelName` / `self.isLoaded` untouched.

Caveat: "release the old container" might be as simple as nilling the local that holds it (ARC drops, MLX cleans up on next sync), or it might require an explicit `MLX.eval(...)` or buffer-flush call. Check the MLX-Swift `ModelContainer` and `MLXLMCommon` APIs available in the bundled SDK before assuming — do **not** invent an API that isn't there. If the SDK has no explicit close/release, the ARC-drop path is acceptable for v1; document that in the PR description so we know it's a soft-release and not guaranteed-immediate.

---

## 6. Stop conditions

**Stop and write up a draft PR if any of these are true:**
- The fix needs to touch any file outside §1's edit-allowed list. Push back; don't expand scope.
- MLX-Swift has no observable release primitive and you're considering adding one. Stop, describe what you saw in the SDK, and ask.
- You've spent >30 min and haven't reached "compiles cleanly + reasoning explained." Stop and report what you have.

**Stop and ship the PR when all of these are true:**
- `MLXEngine.swift` compiles cleanly under the existing project (you don't need to run `xcodebuild` yourself if you can't — Alex or Claude will).
- The fix is in `loadModel` AND `loadFromHub`, applied in the load-then-swap pattern from §5.
- The PR description explains: what the crash was, what release mechanism you used, and what you would do differently if MLX exposed a hard-close primitive.

---

## 7. PR template

Branch off `feature/mlx-llm-engine`. Branch name suggestion: `kimi/mlx-model-switch-fix`.

PR title: `iOS MLX: release prior model before loading a new one`

PR body:
```markdown
## What

Fixes the model-switch crash on iPhone 12 Pro Max when the user already has
one MLX model loaded and switches to a different one in the Models tab.

## Why this fix

<your one-paragraph explanation of root cause and chosen release mechanism>

## What I touched

- `mobile/ios/ihn-home/IhnHome/Runtime/MLXEngine.swift`
  - `loadFromHub`: load-then-swap so a failed switch keeps the prior model loaded
  - `loadModel`: same pattern applied symmetrically
  - <any other small change you made; if none, say "no other changes">

## What I deliberately did not touch

<the read-only files in §1; confirm you stayed in the fence>

## What I would do differently if I owned more scope

<one or two sentences — useful for whoever does the next consolidation>

## Verification I ran (or could not run)

<say what you tried; if you could not build, say so explicitly>
```

---

## 8. Returning the work

When done, push the branch and either open a PR against `feature/mlx-llm-engine` or paste the diff into our chat. Either is fine. We'll handle the build, install, and live verification on iPhone 12 PM.

If you got stuck, return what you have anyway with notes on where you stopped. A half-finished attempt with clear notes is more useful than silence.
