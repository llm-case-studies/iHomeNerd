import Foundation
import WhisperKit

// Wraps WhisperKit so the rest of the app sees a tiny, Sendable-friendly
// surface: `prepare()` to lazy-load the Core ML model on first use,
// `transcribe(_ audio: [Float])` to run a 16kHz mono buffer through.
//
// First prepare() call downloads the model from HuggingFace if it isn't
// cached yet (~145MB for `base`). Subsequent calls reuse the loaded
// pipeline. Cancellation just discards the current call — the engine
// stays warm for the next one.

actor WhisperEngine {
    static let shared = WhisperEngine()

    enum LoadState: Equatable {
        case idle
        case loading
        case ready(model: String)
        case failed(message: String)
    }

    private(set) var state: LoadState = .idle
    private var pipeline: WhisperKit?
    private let modelName = "openai_whisper-base"

    func prepare(progress: ((String) -> Void)? = nil) async {
        if case .ready = state { return }
        state = .loading
        progress?("Loading \(modelName) (download ~145MB if first run)…")
        do {
            // load: true forces the Core ML compute units to be brought up
            // during init. Without it, init "succeeds" without actually
            // loading the encoder/decoder/tokenizer, and transcribe later
            // fails with confusing "tokenizer missing" / "models not loaded"
            // errors mid-call. download: true is already the default but
            // we set it explicitly so the contract is obvious.
            let pipe = try await WhisperKit(
                model: modelName,
                verbose: false,
                logLevel: .error,
                prewarm: true,
                load: true,
                download: true
            )
            self.pipeline = pipe
            state = .ready(model: modelName)
            WhisperBundle.setReady(true)
            progress?("Model ready.")
        } catch {
            state = .failed(message: error.localizedDescription)
            progress?("Model load failed: \(error.localizedDescription)")
        }
    }

    func isReady() -> Bool {
        if case .ready = state { return true }
        return false
    }

    struct Result: Sendable {
        let text: String
        let language: String
        let segments: [Segment]
        struct Segment: Sendable {
            let start: Float
            let end: Float
            let text: String
        }
    }

    enum WhisperError: Error, LocalizedError {
        case notReady(String)
        var errorDescription: String? {
            switch self {
            case .notReady(let m): return "Whisper not ready: \(m)"
            }
        }
    }

    func transcribe(audio: [Float]) async throws -> Result? {
        if !isReady() { await prepare() }
        guard let pipe = pipeline else {
            if case .failed(let m) = state { throw WhisperError.notReady(m) }
            throw WhisperError.notReady("model never loaded")
        }
        let outputs = try await pipe.transcribe(audioArray: audio)
        guard let first = outputs.first else { return nil }
        let segs = first.segments.map { seg in
            Result.Segment(start: seg.start, end: seg.end, text: seg.text)
        }
        return Result(text: first.text, language: first.language, segments: segs)
    }
}
