import Foundation

// Placeholder for the Whisper Core ML model bundle. Returns false today;
// Task #15 will replace this with a real probe (e.g. Bundle.main URL for
// the .mlmodelc, plus a size + sha check). Tier detection in CapabilityHost
// gates on this so we never advertise tier="whisper" when the model isn't
// actually present.

enum WhisperBundle {
    static var isBundled: Bool { false }
    static var modelName: String { "whisper-small-multilingual" }
    static var modelBytes: Int { 0 }
}
