import Foundation
import MLX
import MLXLLM
import MLXLMCommon

actor MLXEngine {
    struct Result: Sendable {
        let text: String
        let processingTime: TimeInterval
        let tokensPerSecond: Double
    }

    enum MLXError: Error, LocalizedError {
        case modelLoadFailed(String)
        case inferenceFailed(String)
        case outOfMemory

        var errorDescription: String? {
            switch self {
            case .modelLoadFailed(let m): return "MLX model load failed: \(m)"
            case .inferenceFailed(let m): return "MLX inference failed: \(m)"
            case .outOfMemory: return "MLX out of memory: device RAM is insufficient for this model."
            }
        }
    }

    // State
    private var isLoaded = false
    private var modelName: String?
    private var modelContainer: ModelContainer?
    private let downloader = MLXHuggingFaceHubDownloader()
    private let tokenizerLoader = MLXHuggingFaceTokenizerLoader()
    
    static let shared = MLXEngine()

    init() {}

    func loadModel(name: String, path: URL) async throws {
        try enforceMemoryBudget(for: name)

        // Capture old model identity and then drop the container *before*
        // loading the new one so their GPU footprints don't overlap.
        let previousName = self.modelName
        let previousConfig: ModelConfiguration?
        let previousPath: URL?
        if let previousContainer = self.modelContainer {
            previousConfig = await previousContainer.configuration
            previousPath = try? await previousContainer.modelDirectory
            self.modelContainer = nil
            self.modelName = nil
            self.isLoaded = false
        } else {
            previousConfig = nil
            previousPath = nil
        }

        // Old model arrays are now in the MLX cache pool; evict them.
        Memory.clearCache()

        do {
            let newContainer = try await LLMModelFactory.shared.loadContainer(
                from: path,
                using: tokenizerLoader
            )
            self.modelContainer = newContainer
            self.modelName = name
            self.isLoaded = true
        } catch {
            // Attempt to restore the previous model so a failed switch
            // doesn't strand the user with nothing loaded.
            if let previousPath {
                do {
                    let restoredContainer = try await LLMModelFactory.shared.loadContainer(
                        from: previousPath,
                        using: tokenizerLoader
                    )
                    self.modelContainer = restoredContainer
                    self.modelName = previousName ?? previousConfig?.name
                    self.isLoaded = true
                } catch {
                    // Restore failed; leave state empty and propagate the
                    // original load error.
                }
            }
            throw MLXError.modelLoadFailed(error.localizedDescription)
        }
    }

    func loadFromHub(configuration: ModelConfiguration) async throws {
        try enforceMemoryBudget(for: configuration.name)

        // Capture old model identity and then drop the container *before*
        // loading the new one so their GPU footprints don't overlap.
        let previousName = self.modelName
        let previousConfig: ModelConfiguration?
        if let previousContainer = self.modelContainer {
            previousConfig = await previousContainer.configuration
            self.modelContainer = nil
            self.modelName = nil
            self.isLoaded = false
        } else {
            previousConfig = nil
        }

        // Old model arrays are now in the MLX cache pool; evict them.
        Memory.clearCache()

        do {
            let newContainer = try await LLMModelFactory.shared.loadContainer(
                from: downloader,
                using: tokenizerLoader,
                configuration: configuration
            )
            self.modelContainer = newContainer
            self.modelName = configuration.name
            self.isLoaded = true
        } catch {
            // Attempt to restore the previous model so a failed switch
            // doesn't strand the user with nothing loaded.
            if let previousConfig {
                do {
                    let restoredContainer = try await LLMModelFactory.shared.loadContainer(
                        from: downloader,
                        using: tokenizerLoader,
                        configuration: previousConfig
                    )
                    self.modelContainer = restoredContainer
                    self.modelName = previousName ?? previousConfig.name
                    self.isLoaded = true
                } catch {
                    // Restore failed; leave state empty and propagate the
                    // original load error.
                }
            }
            throw MLXError.modelLoadFailed(error.localizedDescription)
        }
    }

    func loadedModelName() -> String? {
        modelName
    }

    private func enforceMemoryBudget(for modelName: String) throws {
        let physicalMemoryGB = Double(ProcessInfo.processInfo.physicalMemory) / (1024 * 1024 * 1024)

        // Keep 4B+ models off 6GB devices, but do not confuse 4-bit quantization with 4B parameters.
        if Self.largestParameterCount(in: modelName).map({ $0 >= 4.0 }) == true && physicalMemoryGB < 7.5 {
            throw MLXError.outOfMemory
        }
    }

    private static func largestParameterCount(in modelName: String) -> Double? {
        let pattern = #"(?i)(?:^|[^0-9.])([0-9]+(?:\.[0-9]+)?)\s*b(?:$|[^a-z])"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else {
            return nil
        }

        let range = NSRange(modelName.startIndex..<modelName.endIndex, in: modelName)
        return regex.matches(in: modelName, range: range).compactMap { match -> Double? in
            guard
                match.numberOfRanges > 1,
                let scalarRange = Range(match.range(at: 1), in: modelName)
            else {
                return nil
            }
            return Double(modelName[scalarRange])
        }
        .max()
    }

    func generate(prompt: String) async throws -> Result {
        guard isLoaded, let container = modelContainer else {
            throw MLXError.inferenceFailed("Model not loaded.")
        }
        
        let startTime = Date()
        
        do {
            let parameters = GenerateParameters(temperature: 0.7)
            let messages: [[String: any Sendable]] = [["role": "user", "content": prompt]]
            let userInput = UserInput(messages: messages)
            let input = try await container.prepare(input: userInput)
            let stream = try await container.generate(input: input, parameters: parameters)
            
            var text = ""
            var tokensPerSecond = 0.0
            
            for try await generation in stream {
                switch generation {
                case .chunk(let chunkText):
                    text += chunkText
                case .info(let info):
                    tokensPerSecond = info.tokensPerSecond
                default:
                    break
                }
            }
            
            let duration = Date().timeIntervalSince(startTime)
            
            return Result(
                text: text,
                processingTime: duration,
                tokensPerSecond: tokensPerSecond
            )
        } catch {
            throw MLXError.inferenceFailed(error.localizedDescription)
        }
    }
    
    // Allow CapabilityHost to check if we are loaded without async if possible
    nonisolated func getLoadedModelName() -> String? {
        // Warning: This reads state that is mutated in async.
        // For accurate snapshotting, we might need a dedicated nonisolated lock or similar.
        // For now, returning nil is fine, or we can make it an async capability probe in the future.
        return nil
    }

    // MARK: - Public catalog (for /v1/models and the iOS UI)

    struct PublicAvailableModel: Sendable {
        let id: String
        let displayName: String
        let downloadSizeMB: Int
        let ramWhenLoadedMB: Int
        let parameterSize: String
        let quantization: String
        let note: String
    }

    nonisolated static var availableModels: [PublicAvailableModel] {
        [
            PublicAvailableModel(
                id: LLMRegistry.qwen2_5_1_5b.name,
                displayName: "Qwen 2.5 Instruct",
                downloadSizeMB: 960,
                ramWhenLoadedMB: 1250,
                parameterSize: "1.5B parameters",
                quantization: "4-bit",
                note: "Balanced small chat model"
            ),
            PublicAvailableModel(
                id: LLMRegistry.gemma4_e2b_it_4bit.name,
                displayName: "Gemma 4 E2B Instruct",
                downloadSizeMB: 1500,
                ramWhenLoadedMB: 2000,
                parameterSize: "2B parameters",
                quantization: "4-bit",
                note: "Google Gemma family"
            ),
        ]
    }

    func loadModelById(_ id: String) async throws {
        let configuration: ModelConfiguration
        if id == LLMRegistry.qwen2_5_1_5b.name {
            configuration = LLMRegistry.qwen2_5_1_5b
        } else if id == LLMRegistry.gemma4_e2b_it_4bit.name {
            configuration = LLMRegistry.gemma4_e2b_it_4bit
        } else {
            throw MLXError.modelLoadFailed("unknown model id: \(id)")
        }
        try await loadFromHub(configuration: configuration)
    }
}
