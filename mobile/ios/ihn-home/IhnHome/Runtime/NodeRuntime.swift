import Foundation
import Network
import UIKit

// First node-host stub on iOS. Mirrors the Android NodeRuntimeService /
// LocalNodeRuntime pair: an HTTPS listener on :17777 plus an mDNS
// advertisement of `_ihomenerd._tcp` so peers on the LAN can discover
// the iPhone.
//
// Routes today: GET /discover, GET /health. Enough for the gateway and
// the Dell to confirm this is an iHN node. Catch-up plan items 14/15/16
// expand this into the full surface (Command Center bundle, on-device
// Home CA + .mobileconfig install, /v1/* endpoints).

// Sendable bag of identity/network info handed to nonisolated connection
// handlers. Avoids reaching back into the @MainActor NodeRuntime from the
// NWListener queue.
private struct RuntimeSnapshot: Sendable {
    let hostname: String
    let ips: [String]
    let port: Int
    let fingerprint: String
    let physicalRAM: UInt64
    let arch: String
    let startedAt: Date
}

private struct BootstrapSnapshot: Sendable {
    let hostname: String
    let caPEM: String
    let caFingerprint: String
    let leafFingerprint: String
    let mobileconfig: Data
    let port: Int
}

@MainActor
final class NodeRuntime: ObservableObject {
    @Published private(set) var isRunning: Bool = false
    @Published private(set) var advertisedHostname: String = ""
    @Published private(set) var lanAddresses: [String] = []
    @Published private(set) var port: Int = 17777
    @Published private(set) var fingerprintSHA256: String = ""
    @Published private(set) var caFingerprintSHA256: String = ""
    @Published private(set) var signingPreflight: String = ""
    @Published private(set) var lastError: String?
    @Published private(set) var lastConnectionError: String?
    @Published private(set) var startedAt: Date?
    @Published private(set) var requestCount: Int = 0
    @Published private(set) var connectionFailures: Int = 0
    @Published private(set) var bootstrapState: String = "—"

    private var listener: NWListener?
    private var bootstrapListener: NWListener?
    private let queue = DispatchQueue(label: "com.ihomenerd.home.runtime")
    private var identity: NodeIdentity?
    private var homeCA: HomeCA?

    static let listenPort: NWEndpoint.Port = 17777
    static let bootstrapPort: NWEndpoint.Port = 17778
    static let serviceType = "_ihomenerd._tcp"
    static let product = "iHomeNerd"
    static let version = "0.1.0-dev-ios"

    func start() {
        guard !isRunning else { return }
        lastError = nil

        let host = sanitizedHostname()
        let ips = LocalAddresses.ipv4()
        advertisedHostname = host
        lanAddresses = ips

        let ca: HomeCA
        do {
            ca = try HomeCAStore.loadOrCreate(commonName: "iHomeNerd Home CA on \(host)")
        } catch {
            lastError = "homeCA: \(error)"
            return
        }
        self.homeCA = ca
        caFingerprintSHA256 = ca.fingerprintSHA256

        let identity: NodeIdentity
        do {
            identity = try NodeIdentityStore.generateFresh(
                commonName: "iHomeNerd on \(host)",
                dnsNames: ["\(host).local", host],
                ipAddresses: ips,
                ca: ca
            )
        } catch {
            lastError = "identity: \(error)"
            return
        }
        self.identity = identity
        fingerprintSHA256 = identity.fingerprintSHA256
        signingPreflight = identity.signingPreflight

        let secId = sec_identity_create(identity.secIdentity)
        guard let secId else {
            lastError = "sec_identity_create returned nil"
            return
        }

        let tlsOptions = NWProtocolTLS.Options()
        sec_protocol_options_set_min_tls_protocol_version(
            tlsOptions.securityProtocolOptions,
            .TLSv12
        )
        sec_protocol_options_set_local_identity(
            tlsOptions.securityProtocolOptions,
            secId
        )

        let params = NWParameters(tls: tlsOptions, tcp: .init())
        params.allowLocalEndpointReuse = true
        params.includePeerToPeer = false

        let txt = NWTXTRecord([
            "role": "brain",
            "hostname": "\(host).local",
            "version": Self.version,
            "IPv4": ips.first ?? ""
        ])

        let listener: NWListener
        do {
            listener = try NWListener(using: params, on: Self.listenPort)
        } catch {
            lastError = "listen: \(error)"
            return
        }
        listener.service = NWListener.Service(
            name: "iHomeNerd on \(host)",
            type: Self.serviceType,
            domain: nil,
            txtRecord: txt
        )

        let snapshot = RuntimeSnapshot(
            hostname: host,
            ips: ips,
            port: Int(Self.listenPort.rawValue),
            fingerprint: identity.fingerprintSHA256,
            physicalRAM: ProcessInfo.processInfo.physicalMemory,
            arch: Self.detectArch(),
            startedAt: Date()
        )

        // Capability shape (tts/stt/whisper tier) is rebuilt live on every
        // /capabilities, /discover, /health request — see
        // CapabilityHost.snapshot() callers below. That way a Whisper warmup
        // mid-session flips tier from "parallel" to "whisper" on the next
        // request, no Node toggle required. The auto-prewarm below runs once
        // per Node start so the model is resident by the time the first
        // /v1/transcribe-audio call lands and we don't pay ~30s cold-start
        // under a 503-prone request.
        if WhisperBundle.isBundled {
            Task.detached(priority: .utility) {
                await WhisperEngine.shared.prepare()
            }
        }

        listener.stateUpdateHandler = { [weak self] state in
            Task { @MainActor in
                guard let self else { return }
                switch state {
                case .ready:
                    self.isRunning = true
                    self.startedAt = Date()
                case .failed(let error):
                    self.isRunning = false
                    self.lastError = "listener failed: \(error)"
                case .cancelled:
                    self.isRunning = false
                default: break
                }
            }
        }
        listener.newConnectionHandler = { [weak self] connection in
            guard let self else { return }
            Self.accept(connection, snapshot: snapshot, queue: self.queue,
                onRequest: { [weak self] in
                    Task { @MainActor in self?.requestCount += 1 }
                },
                onError: { [weak self] message in
                    Task { @MainActor in
                        self?.lastConnectionError = message
                        self?.connectionFailures += 1
                    }
                }
            )
        }
        listener.start(queue: queue)
        self.listener = listener

        // Bootstrap listener on :17778 — plain HTTP, hands out the Home CA
        // PEM and a trust-status JSON so peers can install the trust anchor
        // before they ever try to TLS-handshake against :17777.
        let bootstrap = BootstrapSnapshot(
            hostname: host,
            caPEM: ca.certificatePEM,
            caFingerprint: ca.fingerprintSHA256,
            leafFingerprint: identity.fingerprintSHA256,
            mobileconfig: MobileConfig.build(ca: ca, hostname: host),
            port: Int(Self.bootstrapPort.rawValue)
        )
        let bootstrapParams = NWParameters.tcp
        bootstrapParams.allowLocalEndpointReuse = true
        bootstrapParams.includePeerToPeer = false
        let bootstrapListener: NWListener
        do {
            bootstrapListener = try NWListener(using: bootstrapParams, on: Self.bootstrapPort)
        } catch {
            lastError = "bootstrap listen: \(error)"
            return
        }
        bootstrapListener.stateUpdateHandler = { [weak self] state in
            Task { @MainActor in
                switch state {
                case .setup: self?.bootstrapState = "setup"
                case .ready: self?.bootstrapState = "ready"
                case .cancelled: self?.bootstrapState = "cancelled"
                case .failed(let err):
                    self?.bootstrapState = "failed"
                    self?.lastError = "bootstrap :17778 failed: \(err)"
                case .waiting(let err):
                    self?.bootstrapState = "waiting"
                    self?.lastError = "bootstrap :17778 waiting: \(err)"
                @unknown default: self?.bootstrapState = "unknown"
                }
            }
        }
        bootstrapListener.newConnectionHandler = { [weak self] connection in
            guard let self else { return }
            Self.acceptBootstrap(connection, snapshot: bootstrap, queue: self.queue,
                onError: { [weak self] message in
                    Task { @MainActor in
                        self?.lastConnectionError = message
                        self?.connectionFailures += 1
                    }
                })
        }
        bootstrapListener.start(queue: queue)
        self.bootstrapListener = bootstrapListener
    }

    func stop() {
        listener?.cancel()
        listener = nil
        bootstrapListener?.cancel()
        bootstrapListener = nil
        identity = nil
        homeCA = nil
        isRunning = false
        startedAt = nil
    }

    // MARK: - Connection handling (nonisolated, runs on the listener queue)

    nonisolated private static func accept(_ connection: NWConnection,
                               snapshot: RuntimeSnapshot,
                               queue: DispatchQueue,
                               onRequest: @escaping () -> Void,
                               onError: @escaping (String) -> Void) {
        connection.stateUpdateHandler = { state in
            switch state {
            case .ready: break
            case .failed(let error):
                // Surface handshake / TLS / read failures so the Node screen
                // can show why a probe came back as SSL_ERROR_SYSCALL.
                onError("\(connection.endpoint) failed: \(error)")
                connection.cancel()
            case .waiting(let error):
                onError("\(connection.endpoint) waiting: \(error)")
            case .cancelled:
                connection.cancel()
            default: break
            }
        }
        connection.start(queue: queue)
        receive(on: connection, accumulated: Data(), snapshot: snapshot, queue: queue, onRequest: onRequest)
    }

    nonisolated private static func receive(on connection: NWConnection,
                                accumulated: Data,
                                snapshot: RuntimeSnapshot,
                                queue: DispatchQueue,
                                onRequest: @escaping () -> Void) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1024) { data, _, isComplete, error in
            var buffer = accumulated
            if let data, !data.isEmpty {
                buffer.append(data)
            }
            if let request = HTTPRequest.parse(buffer) {
                onRequest()
                dispatch(request: request, snapshot: snapshot, on: connection)
                return
            }
            if error != nil || isComplete {
                connection.cancel()
                return
            }
            receive(on: connection, accumulated: buffer, snapshot: snapshot, queue: queue, onRequest: onRequest)
        }
    }

    nonisolated private static func dispatch(request: HTTPRequest,
                                             snapshot: RuntimeSnapshot,
                                             on connection: NWConnection) {
        // Async POST routes run on a Task and write back when the underlying
        // engine call completes. Sync routes (GET /health etc.) respond
        // immediately on the receive callback's queue.
        if request.method == "POST", request.path == "/v1/transcribe-audio" {
            Task.detached {
                let response = await handleTranscribeAudio(request: request, snapshot: snapshot)
                connection.send(content: response, completion: .contentProcessed { _ in
                    connection.cancel()
                })
            }
            return
        }
        let response = respond(to: request, snapshot: snapshot)
        connection.send(content: response, completion: .contentProcessed { _ in
            connection.cancel()
        })
    }

    nonisolated private static func respond(to request: HTTPRequest, snapshot: RuntimeSnapshot) -> Data {
        switch (request.method, request.path) {
        case ("GET", "/discover"):
            return HTTPResponse.json(discoverJson(snapshot))
        case ("GET", "/health"):
            return HTTPResponse.json(healthJson(snapshot))
        case ("GET", "/capabilities"):
            return HTTPResponse.json(capabilitiesJson(snapshot))
        case ("GET", "/system/stats"):
            return HTTPResponse.json(systemStatsJson(snapshot))
        case ("GET", "/"):
            return HTTPResponse.html(indexHTML(snapshot))
        default:
            return HTTPResponse.text(404, "Not found\n")
        }
    }

    nonisolated private static func handleTranscribeAudio(request: HTTPRequest,
                                                          snapshot: RuntimeSnapshot) async -> Data {
        guard let boundary = Multipart.boundary(from: request.headers["content-type"]) else {
            return HTTPResponse.json(["detail": "expected multipart/form-data"], status: 400)
        }
        guard let parts = Multipart.parse(body: request.body, boundary: boundary) else {
            return HTTPResponse.json(["detail": "could not parse multipart body"], status: 400)
        }
        guard let filePart = parts.first(where: { $0.name == "file" }), !filePart.data.isEmpty else {
            return HTTPResponse.json(["detail": "missing or empty 'file' part"], status: 400)
        }
        let language: String? = parts.first(where: { $0.name == "language" })
            .flatMap { String(data: $0.data, encoding: .utf8) }?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let langHint = whisperLangCode(language)

        let ext: String? = {
            guard let fn = filePart.filename else { return nil }
            let pe = (fn as NSString).pathExtension
            return pe.isEmpty ? nil : pe
        }()

        let samples: [Float]
        let duration: Double
        do {
            let decoded = try WAVDecoder.toMono16kFloat(filePart.data, suggestedExtension: ext)
            samples = decoded.samples
            duration = decoded.duration
        } catch {
            return HTTPResponse.json(
                ["detail": "decode failed: \(error.localizedDescription)"],
                status: 400
            )
        }

        let t0 = Date()
        do {
            let result = try await WhisperEngine.shared.transcribe(audio: samples, language: langHint)
            let elapsed = Date().timeIntervalSince(t0)
            guard let r = result else {
                return HTTPResponse.json(["detail": "transcription returned no result"], status: 502)
            }
            let payload: [String: Any] = [
                "text": r.text,
                "language": r.language,
                "duration": round(duration * 100) / 100,
                "segments": r.segments.map { seg in
                    [
                        "start": Double(round(seg.start * 100) / 100),
                        "end": Double(round(seg.end * 100) / 100),
                        "text": seg.text,
                    ] as [String: Any]
                },
                "processingTime": round(elapsed * 100) / 100,
                "model": WhisperBundle.modelName,
                "backend": "whisperkit_ios",
            ]
            return HTTPResponse.json(payload)
        } catch {
            return HTTPResponse.json(
                ["detail": "transcription failed: \(error.localizedDescription)"],
                status: 502
            )
        }
    }

    nonisolated private static func whisperLangCode(_ raw: String?) -> String? {
        guard let raw, !raw.isEmpty else { return nil }
        // BCP-47 → Whisper short code, mirrors backend/app/asr.py mapping so
        // the contract is consistent across nodes.
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

    // MARK: - JSON bodies (mirror the Android contract)

    nonisolated private static func discoverJson(_ s: RuntimeSnapshot) -> [String: Any] {
        return [
            "product": product,
            "version": version,
            "role": "brain",
            "hostname": s.hostname,
            "ip": s.ips.first ?? "127.0.0.1",
            "port": s.port,
            "protocol": "https",
            "os": "ios",
            "arch": s.arch,
            "ram_bytes": s.physicalRAM,
            "suggested_roles": ["controller", "travel-node-candidate"],
            "strengths": ["portable controller", "trust helper", "LAN node"],
            "accelerators": [],
            "ollama": false,
            "capabilities": capabilityFlatNames(CapabilityHost.snapshot()),
            "network_ips": s.ips,
            "models": [],
        ]
    }

    nonisolated private static func healthJson(_ s: RuntimeSnapshot) -> [String: Any] {
        return [
            "ok": true,
            "status": "ok",
            "product": product,
            "version": version,
            "hostname": s.hostname,
            "ollama": false,
            "providers": ["ios_local"],
            "models": [:] as [String: String],
            "available_capabilities": capabilityFlatNames(CapabilityHost.snapshot()),
            "binding": "0.0.0.0",
            "network_ips": s.ips,
            "port": s.port,
        ]
    }

    nonisolated private static func capabilitiesJson(_ s: RuntimeSnapshot) -> [String: Any] {
        // Mirrors Python backend's flat-booleans + _detail shape: top-level keys
        // are capability flags, _detail carries identity metadata + per-capability
        // sub-objects (voice lists, models, etc.).
        let (flat, detailCaps) = capabilityMaps(CapabilityHost.snapshot())
        let detail: [String: Any] = [
            "hostname": s.hostname,
            "product": product,
            "version": version,
            "os": "ios",
            "arch": s.arch,
            "capabilities": detailCaps,
            "node_profile": [
                "hostname": s.hostname,
                "role": "brain",
                "ips": s.ips,
                "port": s.port,
            ] as [String: Any],
        ]
        var out: [String: Any] = flat
        out["_detail"] = detail
        return out
    }

    nonisolated private static func capabilityMaps(_ c: CapabilitiesSnapshot) -> ([String: Any], [String: Any]) {
        var flat: [String: Any] = [:]
        var detail: [String: Any] = [:]
        if let tts = c.textToSpeech {
            flat["text_to_speech"] = true
            detail["text_to_speech"] = [
                "available": true,
                "voice_count": tts.voices.count,
                "default_language": tts.defaultLanguage,
                "voices": tts.voices.map { v in
                    [
                        "id": v.identifier,
                        "name": v.name,
                        "language": v.language,
                        "quality": v.quality,
                    ]
                },
            ] as [String: Any]
        }
        if let stt = c.speechToText {
            flat["speech_to_text"] = true
            var sttDetail: [String: Any] = [
                "available": true,
                "on_device": stt.onDevice,
                "tier": stt.tier.rawValue,
                "candidate_languages": stt.candidateLanguages,
                "locale_count": stt.supportedLocales.count,
                "supported_locales": stt.supportedLocales,
            ]
            if stt.tier == .whisper {
                sttDetail["whisper"] = [
                    "model": WhisperBundle.modelName,
                    "model_bytes": WhisperBundle.modelBytes,
                    "auto_language_id": true,
                    "code_switching": true,
                ] as [String: Any]
            }
            detail["speech_to_text"] = sttDetail
        }
        if c.transcribeAudio {
            flat["transcribe_audio"] = true
            detail["transcribe_audio"] = [
                "available": true,
                "backend": "whisperkit_ios",
                "model": WhisperBundle.modelName,
                "endpoint": "/v1/transcribe-audio",
                "upload_transport": "multipart/form-data",
                "preferred_upload_mime_type": "audio/wav",
            ] as [String: Any]
        }
        return (flat, detail)
    }

    nonisolated private static func systemStatsJson(_ s: RuntimeSnapshot) -> [String: Any] {
        // Minimal Python-contract-compatible /system/stats. The contract pack
        // requires uptime_seconds (numeric), session_count (int), one of
        // storage_bytes / app_memory_pss_bytes (numeric), connected_apps
        // (list). iOS doesn't have the SQLite-backed sessions the Python
        // backend tracks, so session_count is 0 today; that becomes real
        // when we wire local persistence.
        let uptime = max(0, Date().timeIntervalSince(s.startedAt))
        return [
            "uptime_seconds": round(uptime * 100) / 100,
            "session_count": 0,
            "app_memory_pss_bytes": appResidentBytes(),
            "connected_apps": [] as [String],
            "hostname": s.hostname,
            "product": product,
            "version": version,
        ]
    }

    nonisolated private static func appResidentBytes() -> UInt64 {
        var info = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size / MemoryLayout<integer_t>.size)
        let kr = withUnsafeMutablePointer(to: &info) { ptr -> kern_return_t in
            ptr.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count)
            }
        }
        return kr == KERN_SUCCESS ? info.resident_size : 0
    }

    nonisolated private static func capabilityFlatNames(_ c: CapabilitiesSnapshot) -> [String] {
        var names: [String] = []
        if c.textToSpeech != nil { names.append("text_to_speech") }
        if c.speechToText != nil { names.append("speech_to_text") }
        if c.transcribeAudio { names.append("transcribe_audio") }
        return names
    }

    nonisolated private static func indexHTML(_ s: RuntimeSnapshot) -> String {
        return """
        <!doctype html>
        <html><head><meta charset="utf-8"><title>iHomeNerd on \(s.hostname)</title></head>
        <body style="font-family:-apple-system,system-ui,sans-serif;background:#111;color:#eee;padding:24px;">
        <h1>iHomeNerd on \(s.hostname)</h1>
        <p>iOS NodeRuntime stub. Try <a style="color:#7ad" href="/discover">/discover</a> · <a style="color:#7ad" href="/health">/health</a>.</p>
        <pre style="background:#222;padding:12px;border-radius:6px;font-size:12px;">SHA-256 \(s.fingerprint)</pre>
        </body></html>
        """
    }

    // MARK: - Bootstrap (plain HTTP on :17778)

    nonisolated private static func acceptBootstrap(_ connection: NWConnection,
                                        snapshot: BootstrapSnapshot,
                                        queue: DispatchQueue,
                                        onError: @escaping (String) -> Void) {
        connection.stateUpdateHandler = { state in
            switch state {
            case .failed(let error):
                onError("bootstrap \(connection.endpoint) failed: \(error)")
                connection.cancel()
            case .cancelled:
                connection.cancel()
            default: break
            }
        }
        connection.start(queue: queue)
        receiveBootstrap(on: connection, accumulated: Data(), snapshot: snapshot, queue: queue)
    }

    nonisolated private static func receiveBootstrap(on connection: NWConnection,
                                         accumulated: Data,
                                         snapshot: BootstrapSnapshot,
                                         queue: DispatchQueue) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 16 * 1024) { data, _, isComplete, error in
            var buffer = accumulated
            if let data, !data.isEmpty { buffer.append(data) }
            if let request = HTTPRequest.parse(buffer) {
                let response = respondBootstrap(to: request, snapshot: snapshot)
                connection.send(content: response, completion: .contentProcessed { _ in
                    connection.cancel()
                })
                return
            }
            if error != nil || isComplete {
                connection.cancel()
                return
            }
            receiveBootstrap(on: connection, accumulated: buffer, snapshot: snapshot, queue: queue)
        }
    }

    nonisolated private static func respondBootstrap(to request: HTTPRequest, snapshot: BootstrapSnapshot) -> Data {
        switch (request.method, request.path) {
        case ("GET", "/setup/ca.crt"):
            return HTTPResponse.pem(snapshot.caPEM)
        case ("GET", "/setup/trust-status"):
            return HTTPResponse.json(trustStatusJson(snapshot))
        case ("GET", "/setup/ihomenerd.mobileconfig"):
            return HTTPResponse.mobileconfig(snapshot.mobileconfig)
        case ("GET", "/"):
            return HTTPResponse.html(bootstrapIndexHTML(snapshot))
        default:
            return HTTPResponse.text(404, "Not found\n")
        }
    }

    nonisolated private static func bootstrapIndexHTML(_ s: BootstrapSnapshot) -> String {
        let elided = elideFingerprint(s.caFingerprint)
        return """
        <!doctype html>
        <html><head><meta charset="utf-8"><title>iHomeNerd trust setup on \(s.hostname)</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
        body{font-family:-apple-system,system-ui,sans-serif;background:#0e0e10;color:#eee;padding:24px;max-width:560px;margin:0 auto;}
        h1{font-weight:600;letter-spacing:-0.02em;}
        a.btn{display:block;background:#1f2937;color:#eee;text-decoration:none;padding:14px 16px;border-radius:10px;margin:10px 0;border:1px solid #374151;}
        a.btn b{color:#7dd3fc;}
        code{background:#1f2937;padding:2px 6px;border-radius:4px;font-size:13px;}
        p{color:#9ca3af;font-size:14px;line-height:1.4;}
        .fp{font-family:ui-monospace,monospace;font-size:12px;color:#9ca3af;word-break:break-all;}
        </style></head>
        <body>
        <h1>Trust setup — iHomeNerd on \(s.hostname)</h1>
        <p>Install the Home CA so this device trusts the iHomeNerd nodes on your LAN. The fingerprint below should match what the host shows on its Node screen.</p>
        <p class="fp">CA SHA-256 \(elided)</p>
        <a class="btn" href="/setup/ihomenerd.mobileconfig"><b>iOS / iPadOS:</b> install configuration profile</a>
        <a class="btn" href="/setup/ca.crt"><b>macOS / Linux / Windows:</b> download CA cert (PEM)</a>
        <p>After installing on iOS, open Settings → General → VPN &amp; Device Management → tap the iHomeNerd profile → Install. Then Settings → General → About → Certificate Trust Settings → enable full trust.</p>
        <p>Other endpoints: <code>/setup/ca.crt</code> · <code>/setup/trust-status</code> · <code>/setup/ihomenerd.mobileconfig</code></p>
        </body></html>
        """
    }

    nonisolated private static func elideFingerprint(_ raw: String) -> String {
        let pairs = raw.split(separator: ":")
        guard pairs.count >= 6 else { return raw }
        let head = pairs.prefix(4).joined(separator: ":")
        let tail = pairs.suffix(4).joined(separator: ":")
        return "\(head) … \(tail)"
    }

    nonisolated private static func trustStatusJson(_ s: BootstrapSnapshot) -> [String: Any] {
        // status: trusted | missing_ca | missing_server | mismatch
        // Both are present whenever the runtime is up, so report "trusted".
        return [
            "product": product,
            "version": version,
            "hostname": s.hostname,
            "status": "trusted",
            "homeCa": [
                "present": true,
                "fingerprintSha256": s.caFingerprint,
            ] as [String: Any],
            "serverCert": [
                "present": true,
                "fingerprintSha256": s.leafFingerprint,
            ] as [String: Any],
        ]
    }

    nonisolated private static func detectArch() -> String {
        #if arch(arm64)
        return "arm64"
        #elseif arch(x86_64)
        return "x86_64"
        #else
        return "unknown"
        #endif
    }

    // MARK: - Hostname

    private func sanitizedHostname() -> String {
        let raw = UIDevice.current.name
        let lowered = raw.lowercased()
        var out = ""
        for ch in lowered {
            if ch.isLetter || ch.isNumber || ch == "-" {
                out.append(ch)
            } else if ch == " " || ch == "_" || ch == "." {
                out.append("-")
            }
        }
        let collapsed = out.split(separator: "-").joined(separator: "-")
        return collapsed.isEmpty ? "ios-node" : collapsed
    }
}
