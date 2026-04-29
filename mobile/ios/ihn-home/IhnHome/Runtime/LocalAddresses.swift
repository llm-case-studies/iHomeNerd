import Foundation
#if canImport(Darwin)
import Darwin
#endif

// IPv4 LAN address enumeration via getifaddrs. Filters out loopback and the
// link-local 169.254/16 fallback. Used by the NodeRuntime to publish the
// device's reachable IPs in /discover and the cert SAN.

enum LocalAddresses {
    static func ipv4() -> [String] {
        var addresses: [String] = []
        var ifaddr: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&ifaddr) == 0, let first = ifaddr else { return [] }
        defer { freeifaddrs(ifaddr) }

        var ptr: UnsafeMutablePointer<ifaddrs>? = first
        while let cur = ptr {
            defer { ptr = cur.pointee.ifa_next }
            let flags = Int32(cur.pointee.ifa_flags)
            guard (flags & IFF_UP) == IFF_UP,
                  (flags & IFF_LOOPBACK) == 0,
                  let sa = cur.pointee.ifa_addr else { continue }
            guard sa.pointee.sa_family == sa_family_t(AF_INET) else { continue }
            let nameCStr = cur.pointee.ifa_name
            let ifName = nameCStr.flatMap { String(cString: $0) } ?? ""
            // Skip pdp_ip0 (cellular) and awdl0 (Apple peer-to-peer).
            if ifName.hasPrefix("pdp_ip") || ifName.hasPrefix("awdl") || ifName.hasPrefix("llw") {
                continue
            }
            var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            let result = getnameinfo(sa,
                                     socklen_t(sa.pointee.sa_len),
                                     &host,
                                     socklen_t(host.count),
                                     nil, 0,
                                     NI_NUMERICHOST)
            guard result == 0 else { continue }
            let ip = String(cString: host)
            if ip.hasPrefix("169.254.") { continue }
            if !addresses.contains(ip) {
                addresses.append(ip)
            }
        }
        // Prefer 192.168.* / 10.* / 172.16-31.* over anything else.
        return addresses.sorted { lhs, rhs in
            score(lhs) < score(rhs)
        }
    }

    private static func score(_ ip: String) -> Int {
        if ip.hasPrefix("192.168.") { return 0 }
        if ip.hasPrefix("10.")      { return 1 }
        if ip.hasPrefix("172.")     { return 2 }
        return 3
    }
}
