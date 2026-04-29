import SwiftUI
import AVFoundation

@MainActor
final class SpeakModel: ObservableObject {
    @Published var text: String = "Hello from your iHomeNerd phone. This came from your local network — no cloud, no API key, no round trip."
    @Published var isSpeaking: Bool = false
    @Published var selectedVoiceId: String? = nil

    let voices: [AVSpeechSynthesisVoice]

    private let synth = AVSpeechSynthesizer()
    private let delegateAdapter = SynthDelegate()

    init() {
        voices = AVSpeechSynthesisVoice.speechVoices()
            .sorted { ($0.language, $0.name) < ($1.language, $1.name) }
        synth.delegate = delegateAdapter
        delegateAdapter.onStart = { [weak self] in
            Task { @MainActor in self?.isSpeaking = true }
        }
        delegateAdapter.onFinish = { [weak self] in
            Task { @MainActor in self?.isSpeaking = false }
        }
    }

    func speak() {
        if synth.isSpeaking {
            synth.stopSpeaking(at: .immediate)
        }
        let utterance = AVSpeechUtterance(string: text)
        if let id = selectedVoiceId, let voice = AVSpeechSynthesisVoice(identifier: id) {
            utterance.voice = voice
        }
        synth.speak(utterance)
    }

    func stop() {
        synth.stopSpeaking(at: .immediate)
    }
}

private final class SynthDelegate: NSObject, AVSpeechSynthesizerDelegate {
    var onStart: (() -> Void)?
    var onFinish: (() -> Void)?

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        onStart?()
    }
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        onFinish?()
    }
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        onFinish?()
    }
}

struct SpeakScreen: View {
    @StateObject private var model = SpeakModel()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Speak").ihnH1()
                    Text("This phone speaks. Local AVSpeechSynthesizer — zero network, zero API key.")
                        .ihnSecondary()
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)

                Eyebrow(text: "Text")
                TextEditor(text: $model.text)
                    .font(IhnFont.sans(15))
                    .scrollContentBackground(.hidden)
                    .frame(minHeight: 140)
                    .padding(10)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(IhnColor.bgInput)
                            .overlay(RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(IhnColor.border, lineWidth: 1))
                    )
                    .padding(.horizontal, 20)

                Eyebrow(text: "Voice (\(model.voices.count) available)")
                Picker("Voice", selection: $model.selectedVoiceId) {
                    Text("System default").tag(String?.none)
                    ForEach(model.voices, id: \.identifier) { v in
                        Text("\(v.name) · \(v.language)").tag(Optional(v.identifier))
                    }
                }
                .pickerStyle(.menu)
                .tint(IhnColor.accent)
                .padding(.horizontal, 20)

                HStack(spacing: 12) {
                    Button(action: model.speak) {
                        Label(model.isSpeaking ? "Speaking…" : "Speak",
                              systemImage: "speaker.wave.2.fill")
                            .font(IhnFont.sans(15, weight: .semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(IhnColor.accent)
                    .disabled(model.text.isEmpty)

                    if model.isSpeaking {
                        Button(action: model.stop) {
                            Image(systemName: "stop.fill")
                                .padding(.vertical, 12)
                                .padding(.horizontal, 16)
                        }
                        .buttonStyle(.bordered)
                        .tint(IhnColor.textSecondary)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 14)
                .padding(.bottom, 28)
            }
        }
        .background(IhnColor.bgPrimary.ignoresSafeArea())
        .navigationBarHidden(true)
    }
}

#Preview {
    NavigationStack { SpeakScreen() }
        .preferredColorScheme(.dark)
}
