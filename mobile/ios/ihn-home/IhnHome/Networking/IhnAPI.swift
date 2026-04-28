import Foundation

// Thin client for the iHN HTTP surface.
//
// v1 trust handling is permissive — we accept whatever cert the gateway/node
// presents. Acceptable for development against trusted-LAN endpoints
// (`NSAllowsLocalNetworking` scopes this to local networks at the OS level),
// but NOT what ships. The real path is the `.mobileconfig` Home CA install
// in Settings → Profile, after which URLSession validates against the
// system trust store. This delegate goes away then.

struct IhnGatewayEndpoint: Equatable, Codable {
    let host: String
    let mainPort: Int
    let setupPort: Int

    init(host: String, mainPort: Int = 17777, setupPort: Int = 17778) {
        self.host = host
        self.mainPort = mainPort
        self.setupPort = setupPort
    }

    var mainBase: URL  { URL(string: "https://\(host):\(mainPort)")! }
    var setupBase: URL { URL(string: "http://\(host):\(setupPort)")!  }
}

enum IhnAPIError: Error, LocalizedError {
    case invalidResponse
    case decoding(Error)
    case transport(Error)
    case http(Int)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:    return "invalid response"
        case .decoding(let e):    return "decoding error: \(e.localizedDescription)"
        case .transport(let e):   return "transport error: \(e.localizedDescription)"
        case .http(let code):     return "HTTP \(code)"
        }
    }
}

final class IhnAPI: NSObject {
    let endpoint: IhnGatewayEndpoint
    private lazy var session: URLSession = {
        URLSession(configuration: .ephemeral, delegate: self, delegateQueue: nil)
    }()

    init(endpoint: IhnGatewayEndpoint) {
        self.endpoint = endpoint
        super.init()
    }

    // MARK: - Single endpoints

    func discover() async throws -> DiscoverResponse {
        try await get(path: "/discover", base: endpoint.mainBase)
    }

    func health() async throws -> HealthResponse {
        try await get(path: "/health", base: endpoint.mainBase)
    }

    func trustStatus() async throws -> TrustStatusResponse {
        try await get(path: "/setup/trust-status", base: endpoint.setupBase)
    }

    func capabilities() async throws -> CapabilitiesResponse {
        try await get(path: "/capabilities", base: endpoint.mainBase)
    }

    func cluster() async throws -> ClusterResponse {
        try await get(path: "/cluster/nodes", base: endpoint.mainBase)
    }

    func systemStats() async throws -> SystemStatsResponse {
        try await get(path: "/system/stats", base: endpoint.mainBase)
    }

    // MARK: - Snapshot

    /// Fetch every endpoint we care about in parallel. Per-endpoint failures
    /// surface as `warnings` rather than failing the whole snapshot —
    /// matches the Android repository's behavior.
    func loadSnapshot() async -> GatewaySnapshot {
        let started = Date()

        async let discoverResult     = result(of: discover)
        async let healthResult       = result(of: health)
        async let trustResult        = result(of: trustStatus)
        async let capabilitiesResult = result(of: capabilities)
        async let clusterResult      = result(of: cluster)
        async let systemResult       = result(of: systemStats)

        let (d, h, t, c, cl, s) = await (
            discoverResult, healthResult, trustResult,
            capabilitiesResult, clusterResult, systemResult
        )

        let elapsed = Int(Date().timeIntervalSince(started) * 1000)

        var warnings: [String] = []
        d.error.map  { warnings.append("discover: \($0.localizedDescription)") }
        h.error.map  { warnings.append("health: \($0.localizedDescription)") }
        t.error.map  { warnings.append("trust: \($0.localizedDescription)") }
        c.error.map  { warnings.append("capabilities: \($0.localizedDescription)") }
        cl.error.map { warnings.append("cluster: \($0.localizedDescription)") }
        s.error.map  { warnings.append("system: \($0.localizedDescription)") }

        return GatewaySnapshot(
            baseUrl: endpoint.mainBase,
            fetchedAt: Date(),
            latencyMs: d.value == nil ? nil : elapsed,
            discover: d.value,
            health: h.value,
            trust: t.value,
            capabilities: c.value,
            cluster: cl.value,
            system: s.value,
            warnings: warnings
        )
    }

    private struct Outcome<T> {
        var value: T?
        var error: Error?
    }

    private func result<T>(of work: () async throws -> T) async -> Outcome<T> {
        do { return Outcome(value: try await work(), error: nil) }
        catch { return Outcome(value: nil, error: error) }
    }

    // MARK: - HTTP

    private func get<T: Decodable>(path: String, base: URL) async throws -> T {
        var req = URLRequest(url: base.appendingPathComponent(path))
        req.timeoutInterval = 6
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw IhnAPIError.invalidResponse }
            guard 200..<300 ~= http.statusCode else { throw IhnAPIError.http(http.statusCode) }
            do {
                return try JSONDecoder().decode(T.self, from: data)
            } catch {
                throw IhnAPIError.decoding(error)
            }
        } catch let err as IhnAPIError {
            throw err
        } catch {
            throw IhnAPIError.transport(error)
        }
    }
}

extension IhnAPI: URLSessionDelegate {
    // Dev-only. Removed once Home CA install flow lands.
    func urlSession(_ session: URLSession,
                    didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        if challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
           let trust = challenge.protectionSpace.serverTrust {
            completionHandler(.useCredential, URLCredential(trust: trust))
            return
        }
        completionHandler(.performDefaultHandling, nil)
    }
}
