import Foundation
import Network

// Bonjour browser for iHN nodes on the LAN.
//
// Service type is `_ihomenerd._tcp` (matches what the Android-hosted runtime
// advertises today, captured 2026-04-26 from motorola-edge-2021). The iOS
// Info.plist declares this in NSBonjourServices.
//
// Resolving a result to a host+port is a follow-up step; v1 just surfaces
// service names so the UI can prompt for IP entry. NWBrowser.Result includes
// a metadata.txtRecord with `IPv4=…` which is the practical fast path.

struct DiscoveredNode: Identifiable, Equatable {
    let id: String
    let serviceName: String
    let host: String?
    let port: Int?
    let role: String?
    let version: String?
    let hostname: String?
}

@MainActor
final class BonjourBrowser: ObservableObject {
    @Published private(set) var found: [DiscoveredNode] = []
    @Published private(set) var isScanning: Bool = false

    private var browser: NWBrowser?
    private let serviceType = "_ihomenerd._tcp"

    func start() {
        guard !isScanning else { return }
        isScanning = true
        let params = NWParameters()
        params.includePeerToPeer = false
        let browser = NWBrowser(for: .bonjour(type: serviceType, domain: nil), using: params)
        browser.browseResultsChangedHandler = { [weak self] results, _ in
            guard let self else { return }
            Task { @MainActor in self.absorb(results) }
        }
        browser.start(queue: .main)
        self.browser = browser
    }

    func stop() {
        browser?.cancel()
        browser = nil
        isScanning = false
    }

    private func absorb(_ results: Set<NWBrowser.Result>) {
        var next: [DiscoveredNode] = []
        for r in results {
            guard case let .service(name, type, _, _) = r.endpoint else { continue }
            // TXT records carry the useful identity bits the gateway advertises.
            var ipv4: String? = nil
            var role: String? = nil
            var version: String? = nil
            var hostname: String? = nil
            if case let .bonjour(record) = r.metadata {
                ipv4     = record["IPv4"]
                role     = record["role"]
                version  = record["version"]
                hostname = record["hostname"]
            }
            next.append(DiscoveredNode(
                id: "\(type)/\(name)",
                serviceName: name,
                host: ipv4,
                port: nil,
                role: role,
                version: version,
                hostname: hostname
            ))
        }
        found = next.sorted { $0.serviceName < $1.serviceName }
    }
}
