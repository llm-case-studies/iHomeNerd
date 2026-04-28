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
}

@MainActor
final class NodeRuntime: ObservableObject {
    @Published private(set) var isRunning: Bool = false
    @Published private(set) var advertisedHostname: String = ""
    @Published private(set) var lanAddresses: [String] = []
    @Published private(set) var port: Int = 17777
    @Published private(set) var fingerprintSHA256: String = ""
    @Published private(set) var lastError: String?
    @Published private(set) var lastConnectionError: String?
    @Published private(set) var startedAt: Date?
    @Published private(set) var requestCount: Int = 0
    @Published private(set) var connectionFailures: Int = 0

    private var listener: NWListener?
    private let queue = DispatchQueue(label: "com.ihomenerd.home.runtime")
    private var identity: NodeIdentity?

    static let listenPort: NWEndpoint.Port = 17777
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

        let identity: NodeIdentity
        do {
            identity = try NodeIdentityStore.loadOrCreate(
                commonName: "iHomeNerd on \(host)",
                dnsNames: ["\(host).local", host],
                ipAddresses: ips
            )
        } catch {
            lastError = "identity: \(error)"
            return
        }
        self.identity = identity
        fingerprintSHA256 = identity.fingerprintSHA256

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
            arch: Self.detectArch()
        )

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
    }

    func stop() {
        listener?.cancel()
        listener = nil
        identity = nil
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
        connection.receive(minimumIncompleteLength: 1, maximumLength: 16 * 1024) { data, _, isComplete, error in
            var buffer = accumulated
            if let data, !data.isEmpty {
                buffer.append(data)
            }
            if let request = HTTPRequest.parse(buffer) {
                onRequest()
                let response = respond(to: request, snapshot: snapshot)
                connection.send(content: response, completion: .contentProcessed { _ in
                    connection.cancel()
                })
                return
            }
            if error != nil || isComplete {
                connection.cancel()
                return
            }
            receive(on: connection, accumulated: buffer, snapshot: snapshot, queue: queue, onRequest: onRequest)
        }
    }

    nonisolated private static func respond(to request: HTTPRequest, snapshot: RuntimeSnapshot) -> Data {
        switch (request.method, request.path) {
        case ("GET", "/discover"):
            return HTTPResponse.json(discoverJson(snapshot))
        case ("GET", "/health"):
            return HTTPResponse.json(healthJson(snapshot))
        case ("GET", "/"):
            return HTTPResponse.html(indexHTML(snapshot))
        default:
            return HTTPResponse.text(404, "Not found\n")
        }
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
            "capabilities": [],
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
            "available_capabilities": [],
            "binding": "0.0.0.0",
            "network_ips": s.ips,
            "port": s.port,
        ]
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
