import Foundation
import AVFoundation

// What this iOS node *actually* hosts. Becomes the flat-boolean map and
// _detail.capabilities sub-object on `/capabilities`. Static today
// (capabilities don't change at runtime), so `snapshot()` is called once
// at NodeRuntime.start() and frozen into the RuntimeSnapshot.

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

struct CapabilitiesSnapshot: Sendable {
    let textToSpeech: TextToSpeechCapability?

    static let empty = CapabilitiesSnapshot(textToSpeech: nil)
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
        return CapabilitiesSnapshot(textToSpeech: tts)
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
