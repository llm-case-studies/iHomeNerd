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

    init() {}

    func loadModel(name: String, path: URL) async throws {
        // 1. Enforce RAM check here for 4B vs 2B (as discussed)
        let physicalMemoryGB = Double(ProcessInfo.processInfo.physicalMemory) / (1024 * 1024 * 1024)
        
        // Require 8GB for 4B-class models
        if name.lowercased().contains("4b") && physicalMemoryGB < 7.5 {
            throw MLXError.outOfMemory
        }
        
        // 2. MLXLLM model loading logic
        do {
            let config = ModelConfiguration(directory: path)
            self.modelContainer = try await ModelContainer.load(
                configuration: config,
                modelFactory: LLMModelFactory()
            )
            self.modelName = name
            self.isLoaded = true
        } catch {
            throw MLXError.modelLoadFailed(error.localizedDescription)
        }
    }

    func generate(prompt: String) async throws -> Result {
        guard isLoaded, let container = modelContainer else {
            throw MLXError.inferenceFailed("Model not loaded.")
        }
        
        let startTime = Date()
        
        do {
            // 3. Tokenize the input prompt
            let promptTokens = try await container.perform { _, tokenizer in
                tokenizer.encode(text: prompt)
            }
            
            var generatedTokens: [Int] = []
            
            // 4. Run the forward pass with KV caching
            let parameters = GenerateParameters(temperature: 0.7)
            _ = try await container.perform { model, tokenizer in
                try MLXLMCommon.generate(
                    promptTokens: promptTokens,
                    parameters: parameters,
                    model: model,
                    tokenizer: tokenizer
                ) { tokens in
                    generatedTokens = tokens
                    return .more
                }
            }
            
            // 5. Decode the final output tokens back into a string
            let text = try await container.perform { _, tokenizer in
                tokenizer.decode(tokens: generatedTokens)
            }
            
            let duration = Date().timeIntervalSince(startTime)
            let tps = duration > 0 ? Double(generatedTokens.count) / duration : 0.0
            
            return Result(
                text: text,
                processingTime: duration,
                tokensPerSecond: tps
            )
            
        } catch {
            throw MLXError.inferenceFailed(error.localizedDescription)
        }
    }
}
