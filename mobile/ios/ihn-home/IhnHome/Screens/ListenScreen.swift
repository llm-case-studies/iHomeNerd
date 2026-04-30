import SwiftUI
import AVFoundation
import Speech

enum ListenMode: String, CaseIterable, Identifiable {
    case apple, whisper
    var id: String { rawValue }
    var label: String {
        switch self {
        case .apple: return "Apple"
        case .whisper: return "Whisper"
        }
    }
}

@MainActor
final class ListenModel: ObservableObject {
    @Published var transcript: String = ""
    @Published var winningLocale: String = ""
    @Published var perLocaleTranscripts: [String: String] = [:]  // for the optional inspector
    @Published var isRunning: Bool = false
    @Published var statusLine: String = "Tap Listen to start."
    @Published var permissionDenied: Bool = false
    @Published var candidateLocales: [String] {
        didSet { saveCandidates() }
    }
    @Published var mode: ListenMode = {
        let raw = UserDefaults.standard.string(forKey: ListenModel.modeKey) ?? ""
        return ListenMode(rawValue: raw) ?? .apple
    }() {
        didSet { UserDefaults.standard.set(mode.rawValue, forKey: Self.modeKey) }
    }
    @Published var whisperReady: Bool = false
    @Published var whisperBusy: Bool = false  // model loading or transcribing

    private let audioEngine = AVAudioEngine()
    private var sessions: [LocaleSession] = []
    private var whisperBuffer: [Float] = []
    private var whisperConverter: AVAudioConverter?
    private var whisperTargetFormat: AVAudioFormat?

    private static let candidatesKey = "listen.candidateLocales.v1"
    private static let modeKey = "listen.mode.v1"
    private static let maxParallel = 4

    init() {
        if let saved = UserDefaults.standard.array(forKey: Self.candidatesKey) as? [String], !saved.isEmpty {
            candidateLocales = saved
        } else {
            // Mirror CapabilityHost.defaultCandidateLanguages logic.
            let supported = Set(SFSpeechRecognizer.supportedLocales().map(\.identifier))
            var picks: [String] = []
            for raw in Locale.preferredLanguages.prefix(4) {
                if supported.contains(raw) { picks.append(raw); continue }
                let lang = String(raw.prefix { $0 != "-" })
                if let match = supported.sorted().first(where: { $0.hasPrefix(lang + "-") }) {
                    picks.append(match)
                }
            }
            if !picks.contains("en-US"), supported.contains("en-US") { picks.append("en-US") }
            var seen = Set<String>()
            candidateLocales = picks.filter { seen.insert($0).inserted }
            if candidateLocales.isEmpty { candidateLocales = ["en-US"] }
        }
    }

    private func saveCandidates() {
        UserDefaults.standard.set(candidateLocales, forKey: Self.candidatesKey)
    }

    var supportedLocales: [String] {
        SFSpeechRecognizer.supportedLocales().map(\.identifier).sorted()
    }

    var modeLabel: String {
        switch mode {
        case .apple:
            return candidateLocales.count <= 1 ? "single" : "parallel ×\(candidateLocales.count)"
        case .whisper:
            return whisperLanguageHint == nil ? "whisper · auto" : "whisper · \(whisperLanguageHint!)"
        }
    }

    /// Whisper short code (e.g. "de") when exactly one locale is selected;
    /// otherwise nil so WhisperEngine falls back to auto-detect. The Listen
    /// tab shares its locale picker with Apple parallel mode — picking
    /// exactly one locale is the user's signal that they want to *pin* the
    /// recognizer to that language and skip detection.
    var whisperLanguageHint: String? {
        guard candidateLocales.count == 1, let raw = candidateLocales.first else { return nil }
        return Self.whisperCode(from: raw)
    }

    private static func whisperCode(from raw: String) -> String? {
        // Mirrors NodeRuntime.whisperLangCode + backend/app/asr.py mapping.
        let mapping: [String: String] = [
            "en-US": "en", "en-GB": "en",
            "zh-CN": "zh", "zh-TW": "zh",
            "ja-JP": "ja",
            "ko-KR": "ko",
            "es-ES": "es", "es-MX": "es",
            "fr-FR": "fr",
            "de-DE": "de",
            "it-IT": "it",
            "pt-BR": "pt", "pt-PT": "pt",
            "ru-RU": "ru",
            "tr-TR": "tr",
            "uk-UA": "uk",
            "hi-IN": "hi",
        ]
        if let m = mapping[raw] { return m }
        let short = String(raw.split(separator: "-").first ?? "").lowercased()
        return short.count == 2 ? short : nil
    }

    func toggle() {
        if isRunning { stop(reason: "Stopped.") } else { start() }
    }

    func warmWhisper() {
        guard !whisperReady, !whisperBusy else { return }
        whisperBusy = true
        statusLine = "Loading Whisper model (first run downloads ~145MB)…"
        Task { [weak self] in
            await WhisperEngine.shared.prepare(progress: { msg in
                Task { @MainActor in self?.statusLine = msg }
            })
            await MainActor.run {
                guard let self else { return }
                self.whisperReady = WhisperBundle.isBundled
                self.whisperBusy = false
                self.statusLine = self.whisperReady ? "Whisper ready. Tap Listen to start." : self.statusLine
            }
        }
    }

    private func start() {
        transcript = ""
        winningLocale = ""
        perLocaleTranscripts = [:]
        statusLine = "Asking for permissions…"
        SFSpeechRecognizer.requestAuthorization { [weak self] status in
            DispatchQueue.main.async {
                guard let self else { return }
                // Whisper doesn't strictly need SFSpeechRecognizer auth, but we ask
                // for it once anyway since the user may switch modes.
                let speechOK = status == .authorized || self.mode == .whisper
                guard speechOK else {
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
                        switch self.mode {
                        case .apple: self.beginRecognition()
                        case .whisper: self.beginWhisper()
                        }
                    }
                }
            }
        }
    }

    private func beginRecognition() {
        let active = Array(candidateLocales.prefix(Self.maxParallel))
        guard !active.isEmpty else {
            statusLine = "Pick at least one language."
            return
        }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .spokenAudio, options: [.duckOthers, .defaultToSpeaker])
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            statusLine = "Audio session: \(error.localizedDescription)"
            return
        }

        var built: [LocaleSession] = []
        for id in active {
            let locale = Locale(identifier: id)
            guard let recognizer = SFSpeechRecognizer(locale: locale), recognizer.isAvailable else { continue }
            let request = SFSpeechAudioBufferRecognitionRequest()
            request.shouldReportPartialResults = true
            built.append(LocaleSession(localeId: id, recognizer: recognizer, request: request))
        }
        guard !built.isEmpty else {
            statusLine = "No recognizer available for the selected languages."
            try? AVAudioSession.sharedInstance().setActive(false)
            return
        }
        self.sessions = built

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        // One tap, fans out to every active request. Each NWConnection-style
        // recognizer gets the same buffer, scored independently.
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            guard let self else { return }
            // Capture sessions on the audio thread without crossing actor.
            for session in self.sessions { session.request.append(buffer) }
        }

        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            statusLine = "AudioEngine start: \(error.localizedDescription)"
            stop(reason: nil)
            return
        }

        for index in sessions.indices {
            let id = sessions[index].localeId
            sessions[index].task = sessions[index].recognizer.recognitionTask(with: sessions[index].request) { [weak self] result, error in
                DispatchQueue.main.async {
                    self?.handle(localeId: id, result: result, error: error)
                }
            }
        }

        isRunning = true
        let onDevice = sessions.contains(where: { $0.recognizer.supportsOnDeviceRecognition })
        let where_ = onDevice ? "on-device" : "server-assisted"
        statusLine = "Listening (\(modeLabel), \(where_))…"
    }

    private func handle(localeId: String, result: SFSpeechRecognitionResult?, error: Error?) {
        guard let idx = sessions.firstIndex(where: { $0.localeId == localeId }) else { return }
        if let result {
            let text = result.bestTranscription.formattedString
            sessions[idx].transcript = text
            sessions[idx].confidence = averageConfidence(result.bestTranscription)
            sessions[idx].isFinal = result.isFinal
            perLocaleTranscripts[localeId] = text
            recomputeWinner()
            // Stop the moment any recognizer finalizes — others will be
            // close behind, and waiting for stragglers makes the UI feel
            // unresponsive.
            if result.isFinal { stop(reason: nil) }
        }
        if let error {
            let ns = error as NSError
            // 301/216/203/1110 are Apple's "session ended cleanly /
            // no more speech / cancelled" tail-events, not real errors.
            let benign: Set<Int> = [301, 216, 203, 1110]
            if !benign.contains(ns.code) {
                statusLine = "[\(localeId)] \(ns.domain) \(ns.code): \(ns.localizedDescription)"
            }
            // One recognizer erroring shouldn't stop the others.
            sessions[idx].task = nil
            if sessions.allSatisfy({ $0.task == nil }) { stop(reason: nil) }
        }
    }

    private func averageConfidence(_ t: SFTranscription) -> Float {
        guard !t.segments.isEmpty else { return 0 }
        let sum = t.segments.map(\.confidence).reduce(0, +)
        return sum / Float(t.segments.count)
    }

    private func recomputeWinner() {
        // During partials Apple reports confidence=0, so length is the only
        // signal we have. On finals, prefer confidence; tiebreak by length.
        let candidates = sessions.filter { !$0.transcript.isEmpty }
        guard let winner = candidates.max(by: { a, b in
            if a.isFinal != b.isFinal { return !a.isFinal }  // finals win
            if a.confidence != b.confidence { return a.confidence < b.confidence }
            return a.transcript.count < b.transcript.count
        }) else { return }
        transcript = winner.transcript
        winningLocale = winner.localeId
    }

    // MARK: - Whisper mode

    private func beginWhisper() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .spokenAudio, options: [.duckOthers, .defaultToSpeaker])
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            statusLine = "Audio session: \(error.localizedDescription)"
            return
        }

        let inputNode = audioEngine.inputNode
        let nativeFormat = inputNode.outputFormat(forBus: 0)
        // Whisper expects 16 kHz mono Float32. Build a converter once.
        guard let target = AVAudioFormat(commonFormat: .pcmFormatFloat32,
                                         sampleRate: 16_000,
                                         channels: 1,
                                         interleaved: false) else {
            statusLine = "Couldn't build Whisper target format."
            return
        }
        whisperTargetFormat = target
        let converter = AVAudioConverter(from: nativeFormat, to: target)
        whisperConverter = converter
        whisperBuffer = []

        inputNode.removeTap(onBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 4096, format: nativeFormat) { [weak self] buffer, _ in
            // Audio render thread. Convert here, then hop to MainActor with
            // a Sendable [Float] slice. AVAudioPCMBuffer isn't Sendable, so
            // we deliberately don't capture it across the Task boundary.
            guard let conv = converter else { return }
            let frameCapacity = AVAudioFrameCount(
                Double(buffer.frameLength) * target.sampleRate / buffer.format.sampleRate
            ) + 256
            guard let out = AVAudioPCMBuffer(pcmFormat: target, frameCapacity: frameCapacity) else { return }
            var convError: NSError?
            var supplied = false
            conv.convert(to: out, error: &convError) { _, status in
                if supplied { status.pointee = .noDataNow; return nil }
                supplied = true
                status.pointee = .haveData
                return buffer
            }
            if convError != nil { return }
            guard let chans = out.floatChannelData else { return }
            let count = Int(out.frameLength)
            let slice = Array(UnsafeBufferPointer(start: chans[0], count: count))
            Task { @MainActor [weak self] in
                self?.whisperBuffer.append(contentsOf: slice)
            }
        }

        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            statusLine = "AudioEngine start: \(error.localizedDescription)"
            cleanupAudioOnly()
            return
        }
        isRunning = true
        statusLine = "Listening (whisper, recording)…"

        // Lazy-load model in background while user speaks.
        if !whisperReady {
            warmWhisper()
        }
    }

    private func runWhisperOnAccumulated() {
        let audio = whisperBuffer
        whisperBuffer = []
        if audio.isEmpty {
            statusLine = "No audio captured."
            return
        }
        whisperBusy = true
        let seconds = Double(audio.count) / 16_000.0
        let hint = whisperLanguageHint
        let hintLabel = hint.map { " (pinned: \($0))" } ?? " (auto-detect)"
        statusLine = String(format: "Transcribing %.1fs with whisper%@…", seconds, hintLabel)
        Task { [weak self, hint] in
            do {
                let result = try await WhisperEngine.shared.transcribe(audio: audio, language: hint)
                await MainActor.run {
                    guard let self else { return }
                    self.whisperBusy = false
                    if let r = result {
                        self.transcript = r.text.trimmingCharacters(in: .whitespacesAndNewlines)
                        self.winningLocale = r.language
                        self.statusLine = "Whisper · detected \(r.language) · \(r.segments.count) segment(s)."
                    } else {
                        self.statusLine = "Whisper returned no result."
                    }
                }
            } catch {
                await MainActor.run {
                    guard let self else { return }
                    self.whisperBusy = false
                    self.statusLine = "Whisper error: \(error.localizedDescription)"
                }
            }
        }
    }

    private func cleanupAudioOnly() {
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    func stop(reason: String? = nil) {
        let wasWhisperRunning = mode == .whisper && isRunning
        cleanupAudioOnly()
        for index in sessions.indices {
            sessions[index].request.endAudio()
            sessions[index].task?.cancel()
            sessions[index].task = nil
        }
        sessions.removeAll()
        if let reason { statusLine = reason }
        isRunning = false
        if wasWhisperRunning {
            runWhisperOnAccumulated()
        }
    }

    private struct LocaleSession {
        let localeId: String
        let recognizer: SFSpeechRecognizer
        let request: SFSpeechAudioBufferRecognitionRequest
        var task: SFSpeechRecognitionTask?
        var transcript: String = ""
        var confidence: Float = 0
        var isFinal: Bool = false
    }
}

struct ListenScreen: View {
    @StateObject private var model = ListenModel()
    @State private var showingPicker = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Listen").ihnH1()
                    Text("This phone listens. Apple recognizer is fast and per-locale; Whisper is slower but auto-detects language. Audio never leaves the phone.")
                        .ihnSecondary()
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)

                Eyebrow(text: "Engine")
                Picker("Engine", selection: $model.mode) {
                    ForEach(ListenMode.allCases) { m in
                        Text(m.label).tag(m)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 20)

                if model.mode == .apple {
                    Eyebrow(text: "Languages (\(model.candidateLocales.count) selected · \(model.modeLabel))")
                HStack(spacing: 8) {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(model.candidateLocales, id: \.self) { id in
                                Text(id)
                                    .font(IhnFont.mono(12))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(
                                        Capsule().fill(id == model.winningLocale && !model.winningLocale.isEmpty
                                                       ? IhnColor.accent.opacity(0.25)
                                                       : IhnColor.bgInput)
                                    )
                                    .overlay(Capsule().strokeBorder(IhnColor.border, lineWidth: 1))
                                    .foregroundStyle(IhnColor.textPrimary)
                            }
                        }
                    }
                    Button("Edit") { showingPicker = true }
                        .font(IhnFont.sans(13, weight: .semibold))
                        .foregroundStyle(IhnColor.accent)
                    }
                    .padding(.horizontal, 20)
                } else {
                    Eyebrow(text: "Whisper · \(WhisperBundle.modelName) · \(model.modeLabel)")
                    HStack(spacing: 8) {
                        Text(model.whisperReady
                             ? whisperHintBlurb(model)
                             : (model.whisperBusy
                                ? "Loading…"
                                : "First run downloads ~145MB; tap Preload or just hit Listen."))
                            .font(IhnFont.mono(12))
                            .foregroundStyle(IhnColor.textSecondary)
                        Spacer()
                        if !model.whisperReady {
                            Button("Preload") { model.warmWhisper() }
                                .font(IhnFont.sans(13, weight: .semibold))
                                .foregroundStyle(IhnColor.accent)
                                .disabled(model.whisperBusy)
                        }
                    }
                    .padding(.horizontal, 20)

                    Eyebrow(text: "Language hint (pick 1 to pin, 0 or 2+ for auto-detect)")
                    HStack(spacing: 8) {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(model.candidateLocales, id: \.self) { id in
                                    Text(id)
                                        .font(IhnFont.mono(12))
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Capsule().fill(IhnColor.bgInput))
                                        .overlay(Capsule().strokeBorder(IhnColor.border, lineWidth: 1))
                                        .foregroundStyle(IhnColor.textPrimary)
                                }
                            }
                        }
                        Button("Edit") { showingPicker = true }
                            .font(IhnFont.sans(13, weight: .semibold))
                            .foregroundStyle(IhnColor.accent)
                    }
                    .padding(.horizontal, 20)
                }

                Eyebrow(text: model.winningLocale.isEmpty ? "Transcript" : "Transcript · \(model.winningLocale)")
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
        .sheet(isPresented: $showingPicker) {
            LanguagePickerSheet(
                supported: model.supportedLocales,
                selected: Binding(
                    get: { Set(model.candidateLocales) },
                    set: { newValue in
                        let ordered = model.supportedLocales.filter { newValue.contains($0) }
                        // Preserve original ordering for already-selected items, append new.
                        var merged: [String] = model.candidateLocales.filter { newValue.contains($0) }
                        for id in ordered where !merged.contains(id) { merged.append(id) }
                        model.candidateLocales = Array(merged.prefix(4))
                    }
                ),
                cap: 4
            )
        }
    }
}

@MainActor
private func whisperHintBlurb(_ model: ListenModel) -> String {
    if let hint = model.whisperLanguageHint {
        return "Model ready. Pinned to \(hint) (skipping auto-detect)."
    }
    if model.candidateLocales.isEmpty {
        return "Model ready. Auto-detect language."
    }
    return "Model ready. \(model.candidateLocales.count) selected — auto-detect (pick exactly 1 to pin)."
}

private struct LanguagePickerSheet: View {
    let supported: [String]
    @Binding var selected: Set<String>
    let cap: Int
    @Environment(\.dismiss) private var dismiss
    @State private var query: String = ""

    var filtered: [String] {
        guard !query.isEmpty else { return supported }
        return supported.filter { $0.lowercased().contains(query.lowercased()) }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("Pick up to \(cap) languages. iHomeNerd will run a recognizer per language in parallel and show the highest-scoring transcript.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                Section("Selected (\(selected.count)/\(cap))") {
                    ForEach(supported.filter { selected.contains($0) }, id: \.self) { id in
                        Button {
                            selected.remove(id)
                        } label: {
                            HStack {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(IhnColor.accent)
                                Text(id).font(.body.monospaced())
                                Spacer()
                            }
                        }
                    }
                }
                Section("All locales") {
                    ForEach(filtered, id: \.self) { id in
                        Button {
                            if selected.contains(id) {
                                selected.remove(id)
                            } else if selected.count < cap {
                                selected.insert(id)
                            }
                        } label: {
                            HStack {
                                Image(systemName: selected.contains(id) ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(selected.contains(id) ? IhnColor.accent : .secondary)
                                Text(id).font(.body.monospaced())
                                Spacer()
                            }
                            .opacity(!selected.contains(id) && selected.count >= cap ? 0.4 : 1.0)
                        }
                        .disabled(!selected.contains(id) && selected.count >= cap)
                    }
                }
            }
            .searchable(text: $query, prompt: "Search locale (e.g. ru, fr-FR)")
            .navigationTitle("Languages")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

#Preview {
    NavigationStack { ListenScreen() }
        .preferredColorScheme(.dark)
}
