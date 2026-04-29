import Foundation

// Apple Configuration Profile (.mobileconfig) wrapping the Home CA so other
// iPhones / iPads on the LAN can install the trust anchor with one tap.
// Once installed (Settings → General → VPN & Device Management → trust the
// profile), iOS clients chain leaf certs from this network's iHN nodes to a
// trusted root, so https://<node>:17777/ stops requiring --insecure.
//
// Format: PropertyList plist with one outer PayloadContent entry of
// `com.apple.security.root` carrying the CA cert DER bytes.
//
// UUIDs are derived deterministically from the CA fingerprint so a re-install
// updates the existing profile instead of stacking duplicates in the user's
// profile list.

enum MobileConfig {
    static func build(ca: HomeCA, hostname: String) -> Data {
        let outerUUID = uuidFromHex(ca.fingerprintSHA256, salt: "outer")
        let certUUID = uuidFromHex(ca.fingerprintSHA256, salt: "cert")

        let cert: [String: Any] = [
            "PayloadType": "com.apple.security.root",
            "PayloadVersion": 1,
            "PayloadIdentifier": "com.ihomenerd.home.ca.cert.\(hostname)",
            "PayloadUUID": certUUID,
            "PayloadDisplayName": "iHomeNerd Home CA (\(hostname))",
            "PayloadDescription": "Root certificate so this device trusts iHomeNerd nodes on the LAN.",
            "PayloadCertificateFileName": "ihomenerd-ca.cer",
            "PayloadContent": ca.certificateDER,
        ]

        let outer: [String: Any] = [
            "PayloadType": "Configuration",
            "PayloadVersion": 1,
            "PayloadIdentifier": "com.ihomenerd.home.ca.\(hostname)",
            "PayloadUUID": outerUUID,
            "PayloadDisplayName": "iHomeNerd Home CA on \(hostname)",
            "PayloadDescription": "Installs the iHomeNerd Home CA so this device trusts iHN nodes on the LAN.",
            "PayloadOrganization": "iHomeNerd",
            "PayloadContent": [cert],
        ]

        do {
            return try PropertyListSerialization.data(
                fromPropertyList: outer,
                format: .xml,
                options: 0
            )
        } catch {
            return Data()
        }
    }

    // Take the colon-separated hex fingerprint, drop separators, mix in a salt,
    // hash to 32 hex chars, format as UUID. Stable across runs because the CA
    // fingerprint itself is stable.
    private static func uuidFromHex(_ fingerprint: String, salt: String) -> String {
        let raw = fingerprint.replacingOccurrences(of: ":", with: "") + salt
        var hash: UInt64 = 0xcbf29ce484222325 // FNV-1a 64
        for byte in raw.utf8 {
            hash ^= UInt64(byte)
            hash &*= 0x100000001b3
        }
        // Stretch to 32 hex chars by chaining two hashes.
        let h1 = String(format: "%016llx", hash)
        var hash2: UInt64 = hash
        for byte in salt.utf8 {
            hash2 ^= UInt64(byte)
            hash2 &*= 0x100000001b3
        }
        let h2 = String(format: "%016llx", hash2)
        let hex = (h1 + h2).uppercased()
        // 8-4-4-4-12 layout
        let s = Array(hex)
        return "\(String(s[0..<8]))-\(String(s[8..<12]))-\(String(s[12..<16]))-\(String(s[16..<20]))-\(String(s[20..<32]))"
    }
}
