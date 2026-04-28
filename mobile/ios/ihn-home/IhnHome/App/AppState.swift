import Foundation
import Combine

enum TrustState: String { case verified, stale, mismatch }

enum FetchState {
    case idle, loading
    case ok(Date)
    case failed(String)

    var label: String {
        switch self {
        case .idle:               return "tap to refresh"
        case .loading:            return "refreshing…"
        case .ok(let when):       return "synced \(Self.fmt.string(from: when))"
        case .failed(let reason): return reason
        }
    }

    private static let fmt: DateFormatter = {
        let f = DateFormatter()
        f.timeStyle = .short
        return f
    }()
}

@MainActor
final class AppState: ObservableObject {
    @Published var homeName: String = "Alex's Home"
    @Published var endpoint: IhnGatewayEndpoint
    @Published var snapshot: GatewaySnapshot?
    @Published var fetchState: FetchState = .idle

    // Mocks remain visible until real data replaces them. Clear once we have
    // a real cluster fetch with real nodes — for now both streams co-exist
    // since we only know one real node (the Motorola).
    @Published var alerts: [AlertItem] = AlertItem.mockHome
    @Published var travelSession: TravelSession? = TravelSession.mockActive
    private let mockNodes: [NodeSummary] = NodeSummary.mockHome

    private let userDefaults: UserDefaults
    private static let endpointKey = "ihn.endpoint"

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
        if let data = userDefaults.data(forKey: Self.endpointKey),
           let saved = try? JSONDecoder().decode(IhnGatewayEndpoint.self, from: data) {
            self.endpoint = saved
        } else {
            // Default to HP-Envy-Ubuntu — the always-on gateway-tier node.
            // msi-raider-linux (192.168.0.206) has the RTX 4070 + Gemma 4
            // models when we want worker/dialogue demos. Motorola Edge
            // (192.168.0.246) is currently in flux as Codex iterates.
            self.endpoint = .init(host: "192.168.0.229")
        }
    }

    func setEndpoint(_ next: IhnGatewayEndpoint) {
        endpoint = next
        if let data = try? JSONEncoder().encode(next) {
            userDefaults.set(data, forKey: Self.endpointKey)
        }
    }

    func refresh() async {
        fetchState = .loading
        let api = IhnAPI(endpoint: endpoint)
        let snap = await api.loadSnapshot()
        snapshot = snap
        if snap.discover != nil || snap.trust != nil {
            fetchState = .ok(Date())
        } else {
            let firstWarning = snap.warnings.first ?? "no response"
            fetchState = .failed(firstWarning)
        }
    }

    // MARK: - Derived views

    var trustState: TrustState {
        let fp = snapshot?.trust?.homeCa?.fingerprintSha256
        if fp != nil { return .verified }
        return .mismatch
    }

    var homeCAFingerprint: String {
        snapshot?.trust?.homeCa?.fingerprintSha256.map(elide)
            ?? "SHA256 4C:7E:3B:…:A1:FF"
    }

    var nodes: [NodeSummary] {
        let fp = snapshot?.trust?.homeCa?.fingerprintSha256.map(elide)
        let real = (snapshot?.cluster?.nodes ?? []).map {
            NodeSummary(fromCluster: $0, fingerprint: fp)
        }
        guard !real.isEmpty else { return mockNodes }
        // Real nodes first, then mock rows whose hostnames don't collide.
        let realHosts = Set(real.map(\.host))
        return real + mockNodes.filter { !realHosts.contains($0.host) }
    }

    /// Total clients/apps the gateway currently has connected. Useful for
    /// the "this is real local traffic" banner.
    var liveClientCount: Int {
        snapshot?.system?.connectedClients?.count ?? 0
    }

    /// "Powered by" identity for the served-by banner.
    var servedBy: ServedByInfo? {
        guard let d = snapshot?.discover else { return nil }
        return ServedByInfo(
            hostname: d.hostname ?? "unknown",
            ip: d.ip ?? endpoint.host,
            os: d.os,
            arch: d.arch,
            ramGB: d.ramBytes.map { Int($0 / (1024 * 1024 * 1024)) },
            latencyMs: snapshot?.latencyMs,
            fingerprint: homeCAFingerprint,
            version: d.version
        )
    }

    private func elide(_ raw: String) -> String {
        let pairs = raw.split(separator: ":")
        guard pairs.count >= 6 else { return raw }
        let head = pairs.prefix(3).joined(separator: ":")
        let tail = pairs.suffix(2).joined(separator: ":")
        return "SHA256 \(head):…:\(tail)"
    }
}

struct ServedByInfo {
    let hostname: String
    let ip: String
    let os: String?
    let arch: String?
    let ramGB: Int?
    let latencyMs: Int?
    let fingerprint: String
    let version: String?
}
