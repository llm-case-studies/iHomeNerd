# MLX-Swift-LM Migration Issues Report

This document outlines the current build issues we are facing on the iHomeNerd iOS application while trying to migrate to the latest `mlx-swift-lm` framework (specifically after recent breaking changes to `MLXLMCommon` and `ModelFactory`).

## Background
The latest `mlx-swift-lm` (`main` branch / v0.31) introduced breaking API changes to the way `ModelContainer`s are instantiated. The default `TokenizerLoader` and `Downloader` implementations that were previously built directly into `MLXLMCommon` have been extracted into a separate `MLXHuggingFace` module, relying heavily on Swift Macros (`#huggingFaceLoadModelContainer`, `#hubDownloader`, `#huggingFaceTokenizerLoader`).

## Current Issues

### 1. Missing Dependencies in Macro Expansion
To load the model, we modified `MLXEngine.swift` to use the new `MLXHuggingFace` module and its macros:
```swift
import MLXHuggingFace

self.modelContainer = try await #huggingFaceLoadModelContainer(
    configuration: configuration
)
```
While this is the correct new API, the macro expands into code that directly references the `HuggingFace` and `Tokenizers` modules (from the `swift-huggingface` and `swift-transformers` SPM packages). Because `IhnHome.xcodeproj` does not explicitly define these packages as direct dependencies (they are transitive via `mlx-swift`), the Xcode build fails with:
```
error: unable to resolve module dependency: 'HuggingFace'
error: Unable to resolve module dependency: 'yyjson' (in target 'IhnHome' from project 'IhnHome')
```

### 2. Macro Validation Enforcement
Xcode aggressively validates Swift Macros. To even get the build to attempt macro expansion, we have to bypass validation from the CLI using `xcodebuild -skipMacroValidation`. Relying on `#huggingFaceLoadModelContainer` introduces friction for standard Xcode GUI builds unless we manually trust the plugin.

### 3. Missing Default Loaders in `MLXLMCommon`
We attempted to bypass the macro entirely by reverting to the direct API:
```swift
self.modelContainer = try await LLMModelFactory.shared.loadContainer(
    from: /* any Downloader */, 
    using: /* any TokenizerLoader */,
    configuration: configuration
)
```
However, `MLXLMCommon` no longer provides a built-in `Downloader` or `TokenizerLoader`. To use this method, we would need to implement our own struct conforming to `TokenizerLoader` and `Downloader` utilizing `URLSession`, or somehow inject `swift-transformers` directly.

### 4. `UserInput` Signature Changes
The `UserInput` initialization signature also changed. Previously, it accepted an array of standard initialization models. Now it strictly expects an array of messages typed as `[[String: any Sendable]]`. 
We successfully mitigated this particular issue by modifying the prompt injection:
```swift
let messages: [[String: any Sendable]] = [["role": "user", "content": prompt]]
let userInput = UserInput(messages: messages)
```

## Potential Solutions for Codex to Review
1. **Explicit Project Dependencies**: Modifying the `IhnHome.xcodeproj` to explicitly include `swift-transformers` and `swift-huggingface` as direct remote package dependencies so the `MLXHuggingFace` macro can resolve them during compilation.
2. **Alternative Tokenizer Loader**: Writing a custom `NoOpTokenizerLoader` or minimal `TokenizerLoader` struct inside `MLXEngine.swift` if we are only doing simple token generation and can bypass `swift-transformers`.
3. **Wait for upstream fixes**: Is there an alternative non-macro API exported by `MLXHuggingFace` in `mlx-swift-lm` that doesn't leak transitive module dependencies?

We'd love Codex's insight on the cleanest architectural approach to resolve these dependency resolution errors in `IhnHome.xcodeproj` without completely polluting the Xcode project file.
