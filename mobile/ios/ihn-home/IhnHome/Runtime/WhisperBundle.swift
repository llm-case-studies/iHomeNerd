import Foundation

// Reports whether the on-device Whisper model has ever finished loading on
// this device. CapabilityHost.detectTier() consults this synchronously
// when building the /capabilities snapshot. The flag persists to
// UserDefaults so it survives app relaunches: once the user has
// successfully warmed Whisper once, every subsequent NodeRuntime.start()
// already knows we're whisper-tier and advertises accordingly.
// NodeRuntime.start() pairs that with a background prepare() call so the
// engine is actually warm by the time a /v1/transcribe-audio request
// arrives.

enum WhisperBundle {
    private static let lock = NSLock()
    private static let defaultsKey = "whisper.bundle.ready.v1"

    static var isBundled: Bool {
        lock.lock(); defer { lock.unlock() }
        return UserDefaults.standard.bool(forKey: defaultsKey)
    }

    static func setReady(_ ready: Bool) {
        lock.lock(); defer { lock.unlock() }
        UserDefaults.standard.set(ready, forKey: defaultsKey)
    }

    static var modelName: String { "openai_whisper-base" }
    static var modelBytes: Int { 145_000_000 }
}
