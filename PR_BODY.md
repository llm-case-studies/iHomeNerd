## What

Fixes the model-switch crash on iPhone 12 Pro Max when the user already has
one MLX model loaded and switches to a different one in the Models tab.

## Why this fix

The root cause was that `loadModel` and `loadFromHub` overwrote
`self.modelContainer` directly. On a 6 GB device, loading a second model while
the first still held GPU memory caused the combined footprint to exceed
available RAM, triggering an OS kill.

We now use an **unload-before-load** pattern with explicit MLX cache flush:
1. Capture the old model's identity (`ModelConfiguration`, directory path).
2. Nil out `self.modelContainer` to drop the last Swift strong reference.
3. Call `Memory.clearCache()` to force MLX to evict all cached GPU buffers
   before the new model starts allocating.
4. Load the new model into a now-empty memory budget.
5. If the new load fails, restore the old model from its saved identity so
   the user is never stranded with no model loaded.

**Key insight:** In MLX-Swift, ARC deallocation of a `ModelContainer` only
moves the underlying `MLXArray` objects from **active** memory into the
**cache pool** (kept for reuse). They still occupy GPU/Metal working-set
memory. You must call `Memory.clearCache()` to synchronously return those
buffers to the OS. See `docs/MLX_MODEL_SWITCH_MEMORY_RECIPE.md` for the full
recipe.

## What I touched

- `mobile/ios/ihn-home/IhnHome/Runtime/MLXEngine.swift`
  - `loadFromHub`: unload → `Memory.clearCache()` → load → restore-on-failure
  - `loadModel`: same pattern applied symmetrically
  - Added `import MLX` to access `Memory.clearCache()`

## What I deliberately did not touch

- `ModelsScreen.swift` (read-only caller)
- `ChatScreen.swift` (read-only caller)
- `HuggingFaceMLXBridge.swift` (read-only dependency)
- `CapabilityHost.swift` (read-only nonisolated probe)

## What I would do differently if I owned more scope

If MLX-Swift ever adds a `ModelContainer.close()` or a synchronous GPU buffer
flush primitive, I'd call it immediately after the swap so the old model's
weights are evicted before the new model starts its first prefill. Until then,
`Memory.clearCache()` is the correct and sufficient tool.

## Verification I ran

- Built with Xcode 26.4.1 for arm64-iphoneos (Debug).
- Installed on iPhone 12 Pro Max (iOS 26.4.2) via `xcrun devicectl` over USB.
- Manually tested multiple back-to-back switches: **Qwen → Gemma → Qwen → Gemma**.
- No crashes. App memory stabilized at ~1.1–1.2 GB after each switch, never
  spiking to the ~3.0+ GB that caused the original crash.
