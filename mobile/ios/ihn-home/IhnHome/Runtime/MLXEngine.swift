import Foundation
import MLX
import MLXLLM
import MLXLMCommon
import MLXHuggingFace
import Tokenizers
import HuggingFace

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
    
    static let shared = MLXEngine()

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
            self.modelContainer = try await #huggingFaceLoadModelContainer(
                configuration: config
            )
            self.modelName = name
            self.isLoaded = true
        } catch {
            throw MLXError.modelLoadFailed(error.localizedDescription)
        }
    }

    func loadFromHub(configuration: ModelConfiguration) async throws {
        // Enforce RAM check
        let physicalMemoryGB = Double(ProcessInfo.processInfo.physicalMemory) / (1024 * 1024 * 1024)
        if configuration.name.lowercased().contains("4b") && physicalMemoryGB < 7.5 {
            throw MLXError.outOfMemory
        }
        
        do {
            self.modelContainer = try await #huggingFaceLoadModelContainer(
                configuration: configuration
            )
            self.modelName = configuration.name
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
}
