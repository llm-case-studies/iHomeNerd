# MLX-Swift Model-Switch Memory Recipe

**Date:** 2026-05-01  
**Context:** iHomeNerd iOS app, `feature/mlx-llm-engine` branch  
**Problem:** App crashed when switching from one MLX model to another on 6 GB devices (iPhone 12 Pro Max)

---

## The Crash

When a user already had one MLX model loaded (e.g. **Qwen 2.5 Instruct**, ~1.1 GB resident) and tapped **"Switch Model"** to load a different one (e.g. **Gemma 4 E2B Instruct**, ~2.0 GB resident), the app crashed on iPhone 12 Pro Max.

The root cause was not a logic bug in Swift — it was **MLX's memory management model**.

---

## Attempt 1: Load-Then-Swap (Failed)

The handoff originally suggested a **load-then-swap** pattern:

```swift
let newContainer = try await LLMModelFactory.shared.loadContainer(...)
let previousContainer = self.modelContainer
self.modelContainer = newContainer
self.modelName = name
self.isLoaded = true
// previousContainer released here via ARC
```

**Why it still crashed:**

1. `LLMModelFactory.loadContainer()` allocates new Metal/GPU buffers for the new model **while the old model is still in memory**.
2. The old `ModelContainer` is held in the local `previousContainer` until the end of the scope.
3. Even after `previousContainer` goes out of scope, ARC only drops the **Swift** reference. The underlying C++ `MLXArray` objects go into MLX's **buffer cache pool**, not back to the OS.
4. On a 6 GB device, the simultaneous footprint of old model (active) + new model (loading) exceeded available RAM, and the OS/jetsam killed the app.

**Lesson:** In MLX-Swift, ARC deallocation of a `ModelContainer` does **not** immediately free GPU memory. The weights become "cached" buffers that are eligible for reuse, but they still occupy the Metal working set until either:
- they are evicted by new allocations (if cache limit is hit), or
- `Memory.clearCache()` is called explicitly.

---

## Attempt 2: Unload-Before-Load + Explicit Cache Flush (Worked)

The fix that actually passed manual testing:

### 1. Drop the old model **before** loading the new one

```swift
if let previousContainer = self.modelContainer {
    previousConfig = await previousContainer.configuration
    previousPath = try? await previousContainer.modelDirectory
    self.modelContainer = nil
    self.modelName = nil
    self.isLoaded = false
}
// previousContainer is deallocated here at the end of the if scope
```

By nilling `self.modelContainer` inside the `if let` block, the **last strong reference** to the old container is dropped when the block ends. The old model's `MLXArray`s are now eligible for the cache pool.

### 2. Flush the MLX cache pool explicitly

```swift
Memory.clearCache()
```

`Memory.clearCache()` (from the `MLX` module) calls `mlx_clear_cache()`, which **immediately deallocates all cached buffers** and returns them to the OS. This is the critical step that makes the old model's GPU footprint disappear **before** the new model starts allocating.

### 3. Load the new model into a now-empty memory budget

```swift
let newContainer = try await LLMModelFactory.shared.loadContainer(...)
self.modelContainer = newContainer
self.modelName = configuration.name
self.isLoaded = true
```

Because the old model is fully evicted, only one model's weights are resident at any time.

### 4. Graceful degradation: restore the old model on failure

If the new load fails (network, disk, unexpected MLX error), the user would be stranded with no model. We handle this by capturing the old model's identity **before** dropping it:

```swift
let previousConfig = await previousContainer.configuration
// ... drop container, clear cache, try new load ...
} catch {
    if let previousConfig {
        do {
            let restored = try await LLMModelFactory.shared.loadContainer(
                from: downloader,
                using: tokenizerLoader,
                configuration: previousConfig
            )
            self.modelContainer = restored
            self.modelName = previousName ?? previousConfig.name
            self.isLoaded = true
        } catch {
            // Restore failed — propagate original error
        }
    }
    throw MLXError.modelLoadFailed(error.localizedDescription)
}
```

Because the old model was already downloaded, `loadFromHub` with the saved `ModelConfiguration` hits the local cache and reloads weights quickly.

---

## Key MLX-Swift Memory Concepts

| Concept | What it means for us |
|---|---|
| **Active memory** | `MLXArray`s that are currently referenced by Swift objects (e.g. model weights inside a live `ModelContainer`). This counts against the device's RAM limit. |
| **Cache memory** | Buffers from recently deallocated `MLXArray`s that MLX keeps around for reuse. Not actively referenced, but still resident in Metal/CPU memory. |
| `Memory.clearCache()` | Synchronously frees all cached buffers. Safe to call anytime — it does **not** affect active arrays (like the new model being loaded). |
| ARC ≠ GPU free | Dropping the last Swift reference to a `ModelContainer` only moves the underlying arrays from **active** to **cached**. You must call `Memory.clearCache()` to truly evict them. |

---

## Checklist for Future Model-Switch Fixes

If anyone hits a similar model-switch crash in MLX-Swift:

1. **Do not** load the new model while the old one is still referenced.
2. **Nil out** the old container's strong references so ARC drops it.
3. **Call `Memory.clearCache()`** immediately after to force MLX to return the old weights' buffers to the OS.
4. **Load the new model** only after the cache is clear.

---

## Files Changed

- `mobile/ios/ihn-home/IhnHome/Runtime/MLXEngine.swift`
  - `loadModel`: explicit unload → `Memory.clearCache()` → load → restore-on-failure
  - `loadFromHub`: same pattern, using saved `ModelConfiguration` for restore

---

## Verification

- Built with **Xcode 26.4.1**
- Installed on **iPhone 12 Pro Max** (iOS 26.4.2) via USB / `devicectl`
- Manually tested: **Qwen → Gemma → Qwen → Gemma** (multiple switches)
- No crashes observed. App memory stabilized at ~1.1–1.2 GB after each switch.
