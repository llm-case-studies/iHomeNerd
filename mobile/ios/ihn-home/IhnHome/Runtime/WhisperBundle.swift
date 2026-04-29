import Foundation

// Reports whether the on-device Whisper model is downloaded + loaded.
// CapabilityHost.detectTier() consults this synchronously when building
// the /capabilities snapshot, so we cache an atomic bool that the
// WhisperEngine flips after a successful load. Until the user has
// actually used Whisper at least once the cache is false, and we
// advertise tier="parallel". After a successful load it flips true and
// the next /capabilities request will surface tier="whisper".

enum WhisperBundle {
    private static let lock = NSLock()
    private static var _ready: Bool = false

    static var isBundled: Bool {
        lock.lock(); defer { lock.unlock() }
        return _ready
    }

    static func setReady(_ ready: Bool) {
        lock.lock(); defer { lock.unlock() }
        _ready = ready
    }

    static var modelName: String { "openai_whisper-base" }
    static var modelBytes: Int { 145_000_000 }
}
