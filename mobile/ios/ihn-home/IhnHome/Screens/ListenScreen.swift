import SwiftUI
import AVFoundation
import Speech

@MainActor
final class ListenModel: ObservableObject {
    @Published var transcript: String = ""
    @Published var isRunning: Bool = false
    @Published var statusLine: String = "Tap Listen to start."
    @Published var permissionDenied: Bool = false
    @Published var localeId: String = Locale.current.identifier

    private let audioEngine = AVAudioEngine()
    private var recognizer: SFSpeechRecognizer?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?

    var supportedLocales: [String] {
        SFSpeechRecognizer.supportedLocales()
            .map { $0.identifier }
            .sorted()
    }

    func toggle() {
        if isRunning { stop(reason: "Stopped.") } else { start() }
    }

    private func start() {
        transcript = ""
        statusLine = "Asking for permissions…"
        SFSpeechRecognizer.requestAuthorization { [weak self] status in
            DispatchQueue.main.async {
                guard let self else { return }
                guard status == .authorized else {
                    self.permissionDenied = true
                    self.statusLine = "Speech recognition permission denied. Settings → iHN Home."
                    return
                }
                AVAudioApplication.requestRecordPermission { granted in
                    DispatchQueue.main.async {
                        guard granted else {
                            self.permissionDenied = true
                            self.statusLine = "Microphone permission denied. Settings → iHN Home."
                            return
                        }
                        self.beginRecognition()
                    }
                }
            }
        }
    }

    private func beginRecognition() {
        let locale = Locale(identifier: localeId)
        guard let recognizer = SFSpeechRecognizer(locale: locale), recognizer.isAvailable else {
            statusLine = "Recognizer for \(localeId) is not available."
            return
        }
        self.recognizer = recognizer

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .spokenAudio, options: [.duckOthers, .defaultToSpeaker])
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            statusLine = "Audio session: \(error.localizedDescription)"
            return
        }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        // Don't force on-device — the model for the chosen locale may not be
        // installed, and SFSpeechRecognizer falls back to network gracefully.
        self.request = request

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak request] buffer, _ in
            request?.append(buffer)
        }

        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            statusLine = "AudioEngine start: \(error.localizedDescription)"
            return
        }

        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            DispatchQueue.main.async {
                guard let self else { return }
                if let result {
                    self.transcript = result.bestTranscription.formattedString
                    if result.isFinal { self.stop(reason: nil) }
                }
                if let error {
                    let ns = error as NSError
                    // 301/216/203/1110 are Apple's "session ended cleanly /
                    // no more speech / cancelled" tail-events, not real errors.
                    let benign: Set<Int> = [301, 216, 203, 1110]
                    if benign.contains(ns.code) {
                        self.stop(reason: nil)
                    } else {
                        self.statusLine = "Recognizer \(ns.domain) \(ns.code): \(ns.localizedDescription)"
                        self.stop(reason: nil)
                    }
                }
            }
        }

        isRunning = true
        let where_ = recognizer.supportsOnDeviceRecognition ? "on-device" : "server-assisted"
        statusLine = "Listening (\(localeId), \(where_))…"
    }

    func stop(reason: String? = nil) {
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
        request?.endAudio()
        task?.cancel()
        task = nil
        request = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        if let reason { statusLine = reason }
        isRunning = false
    }
}

struct ListenScreen: View {
    @StateObject private var model = ListenModel()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Listen").ihnH1()
                    Text("This phone listens. Apple's Speech recognizer — on-device when supported, audio never leaves the phone.")
                        .ihnSecondary()
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)

                Eyebrow(text: "Locale (\(model.supportedLocales.count) supported)")
                Picker("Locale", selection: $model.localeId) {
                    ForEach(model.supportedLocales, id: \.self) { id in
                        Text(id).tag(id)
                    }
                }
                .pickerStyle(.menu)
                .tint(IhnColor.accent)
                .padding(.horizontal, 20)

                Eyebrow(text: "Transcript")
                Text(model.transcript.isEmpty ? "—" : model.transcript)
                    .font(IhnFont.sans(17))
                    .foregroundStyle(model.transcript.isEmpty ? IhnColor.textTertiary : IhnColor.textPrimary)
                    .frame(maxWidth: .infinity, minHeight: 140, alignment: .topLeading)
                    .padding(14)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(IhnColor.bgInput)
                            .overlay(RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(IhnColor.border, lineWidth: 1))
                    )
                    .padding(.horizontal, 20)

                Text(model.statusLine)
                    .font(IhnFont.mono(12))
                    .foregroundStyle(model.permissionDenied ? .red : IhnColor.textSecondary)
                    .padding(.horizontal, 20)
                    .padding(.top, 10)

                Button(action: model.toggle) {
                    Label(model.isRunning ? "Stop" : "Listen",
                          systemImage: model.isRunning ? "stop.fill" : "mic.fill")
                        .font(IhnFont.sans(15, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.borderedProminent)
                .tint(model.isRunning ? IhnColor.error : IhnColor.accent)
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
    NavigationStack { ListenScreen() }
        .preferredColorScheme(.dark)
}
