import Foundation
import AVFoundation
import Speech

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

struct SpeechToTextCapability: Sendable {
    let supportedLocales: [String]   // BCP-47, e.g. "en-US"
    let onDevice: Bool                // SFSpeechRecognizer.supportsOnDeviceRecognition
}

struct CapabilitiesSnapshot: Sendable {
    let textToSpeech: TextToSpeechCapability?
    let speechToText: SpeechToTextCapability?

    static let empty = CapabilitiesSnapshot(textToSpeech: nil, speechToText: nil)
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
        let stt: SpeechToTextCapability? = locales.isEmpty
            ? nil
            : SpeechToTextCapability(supportedLocales: locales, onDevice: onDevice)

        return CapabilitiesSnapshot(textToSpeech: tts, speechToText: stt)
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
