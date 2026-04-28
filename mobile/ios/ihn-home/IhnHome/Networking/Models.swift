import Foundation

// Domain models shared across screens. Wire shapes match the JSON served
// by the gateway and Android-hosted runtimes. Captured live from
// 192.168.0.246:17777 (motorola-edge-(2021)) on 2026-04-26.

enum NodeRole: String, Codable {
    case gateway
    case llmWorker = "llm-worker"
    case voiceWorker = "voice-worker"
    case visionWorker = "vision-worker"
    case docs
    case radar
    case automation
    case candidate
    case brain
    case travelNode = "travel-node"
    case lightSpecialist = "light-specialist"
    case pronuncoHelper = "pronunco-helper"
    case unknown

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = NodeRole(rawValue: raw) ?? .unknown
    }
}

enum NodeHealth: String, Codable {
    case ok, degraded, offline, neutral
}

enum CertState: String, Codable {
    case trusted, stale, mismatch, needs
}

struct NodeSummary: Identifiable, Codable {
    let id: String
    let host: String
    let role: NodeRole
    let health: NodeHealth
    let stateLine: String
    let cert: CertState
    let fingerprint: String?
}

struct AlertItem: Identifiable, Codable {
    enum Severity: String, Codable { case blocker, warn, ok }
    let id: String
    let severity: Severity
    let title: String
    let body: String
    let timestamp: String
}

struct TravelSession: Codable {
    let nodeName: String
    let networkLabel: String
    let durationLabel: String
    let homeLabel: String
}

// MARK: - Wire shapes

struct DiscoverResponse: Codable {
    let product: String?
    let version: String?
    let role: NodeRole?
    let hostname: String?
    let ip: String?
    let port: Int?
    let `protocol`: String?
    let os: String?
    let arch: String?
    let gpu: String?
    let ramBytes: Int64?
    let suggestedRoles: [NodeRole]?
    let strengths: [String]?
    let accelerators: [String]?
    let ollama: Bool?
    let capabilities: [String]?
    let qualityProfiles: [String]?
    let networkTransport: String?
    let networkIps: [String]?
    let models: [String]?

    enum CodingKeys: String, CodingKey {
        case product, version, role, hostname, ip, port
        case `protocol`, os, arch, gpu, ollama, capabilities, models
        case ramBytes        = "ram_bytes"
        case suggestedRoles  = "suggested_roles"
        case strengths
        case accelerators
        case qualityProfiles = "quality_profiles"
        case networkTransport = "network_transport"
        case networkIps      = "network_ips"
    }
}

struct HealthResponse: Codable {
    let ok: Bool?
    let status: String?
    let product: String?
    let version: String?
    let hostname: String?
    let providers: [String]?
    let availableCapabilities: [String]?
    let port: Int?

    enum CodingKeys: String, CodingKey {
        case ok, status, product, version, hostname, providers, port
        case availableCapabilities = "available_capabilities"
    }
}

struct TrustStatusResponse: Codable {
    let status: String?
    let message: String?
    let lanIp: String?
    let lanIps: [String]?
    let hostnames: [String]?
    let homeCa: HomeCAInfo?
    let serverCert: ServerCertInfo?

    struct HomeCAInfo: Codable {
        let present: Bool?
        let subject: String?
        let issuer: String?
        let fingerprintSha256: String?
        let notBefore: String?
        let notAfter: String?
        let shared: Bool?
    }

    struct ServerCertInfo: Codable {
        let present: Bool?
        let subject: String?
        let fingerprintSha256: String?
        let sans: [String]?
    }
}

struct CapabilitiesResponse: Codable {
    // Flat map of capability name → available bool
    let capabilities: [String: Bool]?
    // Rich per-capability detail under `_detail.capabilities`
    let detail: DetailRoot?

    struct DetailRoot: Codable {
        let nodeProfile: NodeProfile?
        let capabilities: [String: CapabilityDetail]?

        enum CodingKeys: String, CodingKey {
            case nodeProfile = "node_profile"
            case capabilities
        }
    }

    struct NodeProfile: Codable {
        let runtime: String?
        let portable: Bool?
        let os: String?
        let arch: String?
        let ramBytes: Int64?
        let networkHint: String?
        let qualityProfiles: [String]?
        let suggestedRoles: [String]?
        let hostname: String?

        enum CodingKeys: String, CodingKey {
            case runtime, portable, os, arch, hostname
            case ramBytes        = "ram_bytes"
            case networkHint     = "network_hint"
            case qualityProfiles = "quality_profiles"
            case suggestedRoles  = "suggested_roles"
        }
    }

    struct CapabilityDetail: Codable {
        let available: Bool?
        let title: String?
        let implementation: String?
        let backend: String?
        let tier: String?
        let latencyClass: String?
        let offline: Bool?
        let streaming: Bool?
        let packName: String?
        let loadState: String?
        let languages: [String]?
        let note: String?

        enum CodingKeys: String, CodingKey {
            case available, title, implementation, backend, tier
            case offline, streaming, languages, note
            case latencyClass = "latency_class"
            case packName     = "pack_name"
            case loadState    = "load_state"
        }
    }

    enum CodingKeys: String, CodingKey {
        case capabilities
        case detail = "_detail"
    }
}

struct ClusterResponse: Codable {
    let gateway: GatewayPointer?
    let nodes: [ClusterNode]?

    struct GatewayPointer: Codable {
        let hostname: String?
        let url: String?
    }

    struct ClusterNode: Codable {
        let hostname: String?
        let ip: String?
        let os: String?
        let arch: String?
        let suggestedRoles: [String]?
        let strengths: [String]?
        let models: [String]?
        let capabilities: [String]?
        let qualityProfiles: [String]?
        let networkTransport: String?
        let networkIps: [String]?
        let managedNode: ManagedInfo?
        let offline: Bool?

        struct ManagedInfo: Codable {
            let state: String?
            let runtimeKind: String?
        }

        enum CodingKeys: String, CodingKey {
            case hostname, ip, os, arch, strengths, models, capabilities, offline
            case suggestedRoles   = "suggested_roles"
            case qualityProfiles  = "quality_profiles"
            case networkTransport = "network_transport"
            case networkIps       = "network_ips"
            case managedNode      = "managedNode"
        }
    }
}

struct SystemStatsResponse: Codable {
    let uptimeSeconds: Int64?
    let sessionCount: Int?
    let batteryPercent: Int?
    let batteryTempC: Double?
    let freeStorageBytes: Int64?
    let totalStorageBytes: Int64?
    let totalRamBytes: Int64?
    let appMemoryPssBytes: Int64?
    let processCpuPercent: Double?
    let thermalStatus: String?
    let remoteClientCount: Int?
    let connectedClients: [ConnectedClient]?
    let connectedApps: [ConnectedApp]?

    struct ConnectedClient: Codable, Identifiable {
        var id: String { ip + (lastSeen ?? "") }
        let ip: String
        let label: String?
        let requestCount: Int?
        let lastSeen: String?
        let lastPath: String?
        let userAgent: String?

        enum CodingKeys: String, CodingKey {
            case ip, label
            case requestCount = "request_count"
            case lastSeen     = "last_seen"
            case lastPath     = "last_path"
            case userAgent    = "user_agent"
        }
    }

    struct ConnectedApp: Codable, Identifiable {
        var id: String { name }
        let name: String
        let activeSessions: Int?
        let lastSeen: String?

        enum CodingKeys: String, CodingKey {
            case name
            case activeSessions = "active_sessions"
            case lastSeen       = "last_seen"
        }
    }

    enum CodingKeys: String, CodingKey {
        case uptimeSeconds      = "uptime_seconds"
        case sessionCount       = "session_count"
        case batteryPercent     = "battery_percent"
        case batteryTempC       = "battery_temp_c"
        case freeStorageBytes   = "free_storage_bytes"
        case totalStorageBytes  = "total_storage_bytes"
        case totalRamBytes      = "total_ram_bytes"
        case appMemoryPssBytes  = "app_memory_pss_bytes"
        case processCpuPercent  = "process_cpu_percent"
        case thermalStatus      = "thermal_status"
        case remoteClientCount  = "remote_client_count"
        case connectedClients   = "connected_clients"
        case connectedApps      = "connected_apps"
    }
}

// MARK: - Snapshot
//
// Bundles everything we fetched in one refresh, plus per-endpoint warnings
// for transparency. Mirrors the GatewaySnapshot type Codex uses on the
// Android side (mobile/android/ihn-home/.../IhnGatewayRepository.kt).

struct GatewaySnapshot {
    let baseUrl: URL
    let fetchedAt: Date
    let latencyMs: Int?               // round-trip for /discover
    let discover: DiscoverResponse?
    let health: HealthResponse?
    let trust: TrustStatusResponse?
    let capabilities: CapabilitiesResponse?
    let cluster: ClusterResponse?
    let system: SystemStatsResponse?
    let warnings: [String]
}

// MARK: - Mock fixtures

extension NodeSummary {
    static let mockHome: [NodeSummary] = [
        .init(id: "hp",   host: "HP-Envy-Ubuntu",   role: .gateway,
              health: .ok, stateLine: "managed · 12d uptime",
              cert: .trusted, fingerprint: "SHA256 4C:7E:3B:…:A1:FF"),
        .init(id: "msi",  host: "msi-raider-linux", role: .llmWorker,
              health: .ok, stateLine: "managed · RTX 4070",
              cert: .trusted, fingerprint: "SHA256 4C:7E:3B:…:A1:FF"),
        .init(id: "acer", host: "Acer-HL",          role: .voiceWorker,
              health: .degraded, stateLine: "degraded · cert mismatch",
              cert: .mismatch, fingerprint: "SHA256 9A:BB:11:…:3C:02"),
        .init(id: "pi",   host: "pi-garage",        role: .candidate,
              health: .neutral, stateLine: "discovered · awaiting trust",
              cert: .needs, fingerprint: nil)
    ]
}

extension AlertItem {
    static let mockHome: [AlertItem] = [
        .init(id: "1", severity: .blocker,
              title: "Trust mismatch on Acer-HL",
              body:  "Cert chain no longer matches Home CA. Re-pair from Trust.",
              timestamp: "2m"),
        .init(id: "2", severity: .warn,
              title: "Update available",
              body:  "iHN 0.4.2 → 0.4.3 on msi-raider-linux. Review before applying.",
              timestamp: "14m"),
        .init(id: "3", severity: .warn,
              title: "Disk pressure",
              body:  "HP-Envy-Ubuntu: 38 GB free of 480 GB.",
              timestamp: "1h"),
        .init(id: "4", severity: .ok,
              title: "Update applied",
              body:  "gateway → 0.4.2 · trust re-verified.",
              timestamp: "8h")
    ]
}

extension TravelSession {
    static let mockActive = TravelSession(
        nodeName: "pixel-travel-node",
        networkLabel: "tethered",
        durationLabel: "42 m",
        homeLabel: "Alex's Home"
    )
}

// MARK: - Helpers

extension NodeRole {
    var displayLabel: String {
        switch self {
        case .gateway:           return "gateway"
        case .llmWorker:         return "llm-worker"
        case .voiceWorker:       return "voice-worker"
        case .visionWorker:      return "vision-worker"
        case .docs:              return "docs"
        case .radar:             return "radar"
        case .automation:        return "automation"
        case .candidate:         return "candidate"
        case .brain:             return "brain"
        case .travelNode:        return "travel-node"
        case .lightSpecialist:   return "light-specialist"
        case .pronuncoHelper:    return "pronunco-helper"
        case .unknown:           return "unknown"
        }
    }
}

extension NodeHealth {
    var tone: IhnTone {
        switch self {
        case .ok:        return .ok
        case .degraded:  return .err
        case .offline:   return .err
        case .neutral:   return .neutral
        }
    }
}

extension NodeSummary {
    init(fromCluster n: ClusterResponse.ClusterNode, fingerprint: String?) {
        let host = n.hostname ?? n.ip ?? "unknown"
        let role: NodeRole = (n.suggestedRoles?.first).flatMap { NodeRole(rawValue: $0) } ?? .unknown
        let stateBits: [String] = [
            n.os ?? "",
            n.arch ?? "",
            n.managedNode?.state.map { "managed · \($0)" } ?? ""
        ].filter { !$0.isEmpty }
        self.init(
            id: host,
            host: host,
            role: role,
            health: (n.offline ?? false) ? .offline : .ok,
            stateLine: stateBits.joined(separator: " · "),
            cert: fingerprint == nil ? .needs : .trusted,
            fingerprint: fingerprint
        )
    }
}
