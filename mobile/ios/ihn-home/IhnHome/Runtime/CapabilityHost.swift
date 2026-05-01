import Foundation
import AVFoundation
import Speech

// What this iOS node *actually* hosts. Becomes the flat-boolean map and
// _detail.capabilities sub-object on `/capabilities`. Rebuilt live on every
// /capabilities, /discover, /health request — cheap (a few synchronous
// AVSpeechSynthesisVoice / SFSpeechRecognizer queries plus a UserDefaults
// lookup for the Whisper bundle flag) and lets a mid-session Whisper warmup
// flip the advertised tier without a Node toggle.

struct CapabilityVoice: Sendable {
    let identifier: String
    let name: String
    let language: String
    let quality: String  // "default" | "enhanced" | "premium"
}

struct TextToSpeechCapability: Sendable {
    let voices: [CapabilityVoice]
    let defaultLanguage: String
}

enum SpeechTier: String, Sendable {
    case single, parallel, whisper
}

struct SpeechToTextCapability: Sendable {
    let supportedLocales: [String]   // BCP-47, e.g. "en-US"
    let onDevice: Bool                // SFSpeechRecognizer.supportsOnDeviceRecognition
    let tier: SpeechTier
struct AnalyzeImageCapability: Sendable {
    let ocrSupported: Bool                // true on iOS 13+
    let recognitionLanguages: [String]    // BCP-47 list from Vision
}

struct ChatCapability: Sendable {
    let available: Bool
    let loadedPackName: String?
}

struct CapabilitiesSnapshot: Sendable {
    let textToSpeech: TextToSpeechCapability?
    let speechToText: SpeechToTextCapability?
    // True when this node serves /v1/transcribe-audio. Only exposed when the
    // Whisper tier is active because the Apple-engine path needs file-URL
    // recognition we haven't wired yet. Mirrors Python backend's
    // `transcribe_audio` flat capability.
    let transcribeAudio: Bool
    let analyzeImage: AnalyzeImageCapability?
    let chat: ChatCapability?

    static let empty = CapabilitiesSnapshot(textToSpeech: nil, speechToText: nil, transcribeAudio: false, analyzeImage: nil, chat: nil)
}

enum CapabilityHost {
    static func snapshot() -> CapabilitiesSnapshot {
        let raw = AVSpeechSynthesisVoice.speechVoices()
        let voices = raw.map { v in
            CapabilityVoice(
                identifier: v.identifier,
                name: v.name,
                language: v.language,
                quality: qualityName(v.quality)
            )
        }
        let defaultLang = AVSpeechSynthesisVoice.currentLanguageCode()
        let tts: TextToSpeechCapability? = voices.isEmpty
            ? nil
            : TextToSpeechCapability(voices: voices, defaultLanguage: defaultLang)

        // SFSpeechRecognizer supports a fixed list of locales on this device;
        // a probe-default locale tells us if the recognizer is even available.
        let locales = SFSpeechRecognizer.supportedLocales()
            .map { $0.identifier }
            .sorted()
        let onDevice: Bool = {
            if let probe = SFSpeechRecognizer() { return probe.supportsOnDeviceRecognition }
            return false
        }()
        let tier = detectTier()
        let candidates = defaultCandidateLanguages(supported: locales, tier: tier)
        let stt: SpeechToTextCapability? = locales.isEmpty
            ? nil
            : SpeechToTextCapability(
                supportedLocales: locales,
                onDevice: onDevice,
                tier: tier,
                candidateLanguages: candidates
            )

        let transcribeAudio = (tier == .whisper)
        let analyzeImage = AnalyzeImageCapability(
            ocrSupported: true,
            recognitionLanguages: OCREngine.supportedRecognitionLanguages
        )
        
        let mem = ProcessInfo.processInfo.physicalMemory
        let gb: UInt64 = 1024 * 1024 * 1024
        // Show chat available if we have at least 6GB RAM (iPhone 12 Pro Max floor)
        let chat = ChatCapability(
            available: mem >= 5 * gb,
            loadedPackName: MLXEngine.shared.getLoadedModelName()
        )
        
        return CapabilitiesSnapshot(
            textToSpeech: tts,
            speechToText: stt,
            transcribeAudio: transcribeAudio,
            analyzeImage: analyzeImage,
            chat: chat
        )
    }

    // HW probe. ProcessInfo.physicalMemory reports user-visible RAM, which
    // sits ~5–10% under the marketing GB on every iPhone (12 Pro Max ships
    // 6 GB but reports ~5.56 GiB; iPhone 11 ships 4 GB but reports ~3.6 GiB).
    // Use thresholds calibrated against those real values: 5 GiB cleanly
    // admits the 6 GB-class (12 PM, 13 PM, 14 PM, 15-line) while excluding
    // 4 GB-class devices that can't run Whisper-base comfortably.
    private static func detectTier() -> SpeechTier {
        let mem = ProcessInfo.processInfo.physicalMemory
        let gb: UInt64 = 1024 * 1024 * 1024
        let whisperBundled = WhisperBundle.isBundled
        if mem >= 5 * gb && whisperBundled { return .whisper }
        if mem >= 3 * gb { return .parallel }
        return .single
    }

    // Top user-preferred languages, normalized to BCP-47 tags the recognizer
    // actually supports. Falls back to en-US if nothing matches. The Listen
    // tab can override this once it has its own picker UI.
    private static func defaultCandidateLanguages(supported: [String], tier: SpeechTier) -> [String] {
        guard tier != .single else { return [] }
        let supportedSet = Set(supported)
        var picks: [String] = []
        for raw in Locale.preferredLanguages.prefix(4) {
            if supportedSet.contains(raw) { picks.append(raw); continue }
            // Try language-only match: "ru" → first supported "ru-*"
            let lang = String(raw.prefix { $0 != "-" })
            if let match = supported.first(where: { $0.hasPrefix(lang + "-") }) {
                picks.append(match)
            }
        }
        if !picks.contains("en-US"), supportedSet.contains("en-US") {
            picks.append("en-US")
        }
        // Dedup preserving order.
        var seen = Set<String>()
        return picks.filter { seen.insert($0).inserted }
    }

    private static func qualityName(_ q: AVSpeechSynthesisVoiceQuality) -> String {
        switch q {
        case .default: return "default"
        case .enhanced: return "enhanced"
        case .premium: return "premium"
        @unknown default: return "unknown"
        }
    }
}
