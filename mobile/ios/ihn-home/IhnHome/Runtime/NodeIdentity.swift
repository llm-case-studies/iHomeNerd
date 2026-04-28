import Foundation
import Network
import Security
import CryptoKit
import X509
import SwiftASN1

// First-cut TLS identity for the iOS NodeRuntime stub. Generates an EC P-256
// key in the keychain (kSecAttrIsPermanent), self-signs a cert that lists the
// device's hostname/IP via SAN, and resolves to a sec_identity_t for
// NWListener TLS.
//
// This is the dev/demo path. It is the same machinery that catch-up plan
// item 15 will turn into a real Home CA — the difference will be issuance
// chain (Home CA -> per-node leaf) rather than self-signed, plus
// .mobileconfig install on the trusting client. For now the gateway/Dell
// just see a self-signed cert and click through.

enum NodeIdentityError: Error, CustomStringConvertible {
    case keyGenerationFailed(String)
    case certEncodingFailed(String)
    case keychainFailed(OSStatus, String)
    case identityLookupFailed

    var description: String {
        switch self {
        case .keyGenerationFailed(let m): return "key gen: \(m)"
        case .certEncodingFailed(let m):  return "cert encode: \(m)"
        case .keychainFailed(let s, let m): return "keychain \(s): \(m)"
        case .identityLookupFailed:       return "identity lookup empty"
        }
    }
}

struct NodeIdentity {
    let secIdentity: SecIdentity
    let secCertificate: SecCertificate
    let certificateDER: Data
    let fingerprintSHA256: String   // hex, colon-separated, uppercase
    let commonName: String
    let dnsNames: [String]
    let ipAddresses: [String]
    let createdAt: Date
}

enum NodeIdentityStore {
    private static let keyLabel = "iHomeNerd-iOS-runtime"
    private static let keyTag = "com.ihomenerd.home.runtime.key".data(using: .utf8)!

    static func loadOrCreate(commonName: String,
                             dnsNames: [String],
                             ipAddresses: [String]) throws -> NodeIdentity {
        if let existing = try lookupIdentity() {
            return existing
        }
        return try generate(commonName: commonName,
                            dnsNames: dnsNames,
                            ipAddresses: ipAddresses)
    }

    static func reset() throws {
        // Delete cert and key by tag/label so the next start regenerates.
        let _ = SecItemDelete([
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: keyTag,
        ] as CFDictionary)
        let _ = SecItemDelete([
            kSecClass as String: kSecClassCertificate,
            kSecAttrLabel as String: keyLabel,
        ] as CFDictionary)
    }

    // MARK: - Generation

    private static func generate(commonName: String,
                                 dnsNames: [String],
                                 ipAddresses: [String]) throws -> NodeIdentity {
        // 1. Generate persistent EC P-256 SecKey.
        let secKey = try generateSecKey()

        // 2. Wrap as Certificate.PrivateKey for swift-certificates.
        let certKey = try Certificate.PrivateKey(secKey)

        // 3. Build self-signed cert.
        let subject = try DistinguishedName {
            CommonName(commonName)
            OrganizationName("iHomeNerd")
        }
        let now = Date()
        // Push notValidBefore back 60s to dodge clock-skew between iPhone and Dell.
        let notBefore = now.addingTimeInterval(-60)
        let notAfter = now.addingTimeInterval(60 * 60 * 24 * 365)
        let san = try buildSAN(dnsNames: dnsNames, ipAddresses: ipAddresses)

        let cert = try Certificate(
            version: .v3,
            serialNumber: Certificate.SerialNumber(),
            publicKey: certKey.publicKey,
            notValidBefore: notBefore,
            notValidAfter: notAfter,
            issuer: subject,
            subject: subject,
            signatureAlgorithm: .ecdsaWithSHA256,
            extensions: try Certificate.Extensions {
                Critical(
                    BasicConstraints.notCertificateAuthority
                )
                Critical(
                    KeyUsage(digitalSignature: true, keyEncipherment: true)
                )
                try ExtendedKeyUsage([.serverAuth, .clientAuth])
                san
            },
            issuerPrivateKey: certKey
        )

        // 4. Serialize to DER, create SecCertificate.
        var serializer = DER.Serializer()
        do {
            try serializer.serialize(cert)
        } catch {
            throw NodeIdentityError.certEncodingFailed("\(error)")
        }
        let der = Data(serializer.serializedBytes)
        guard let secCert = SecCertificateCreateWithData(nil, der as CFData) else {
            throw NodeIdentityError.certEncodingFailed("SecCertificateCreateWithData returned nil")
        }

        // 5. Add cert to keychain. The matching key is already in the keychain
        //    (kSecAttrIsPermanent at generation), so adding the cert links them
        //    into a SecIdentity.
        let addStatus = SecItemAdd([
            kSecClass as String: kSecClassCertificate,
            kSecValueRef as String: secCert,
            kSecAttrLabel as String: keyLabel,
        ] as CFDictionary, nil)
        guard addStatus == errSecSuccess || addStatus == errSecDuplicateItem else {
            throw NodeIdentityError.keychainFailed(addStatus, "SecItemAdd cert")
        }

        // 6. Look up SecIdentity.
        guard let id = try lookupIdentity() else {
            throw NodeIdentityError.identityLookupFailed
        }
        return id
    }

    private static func generateSecKey() throws -> SecKey {
        let access = SecAccessControlCreateWithFlags(
            nil,
            kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            [],
            nil
        )
        var attrs: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
            kSecAttrIsPermanent as String: true,
            kSecAttrApplicationTag as String: keyTag,
            kSecAttrLabel as String: keyLabel,
        ]
        if let access {
            attrs[kSecAttrAccessControl as String] = access
        }
        var error: Unmanaged<CFError>?
        guard let key = SecKeyCreateRandomKey(attrs as CFDictionary, &error) else {
            let msg = (error?.takeRetainedValue()).map { "\($0)" } ?? "nil error"
            throw NodeIdentityError.keyGenerationFailed(msg)
        }
        return key
    }

    private static func buildSAN(dnsNames: [String],
                                 ipAddresses: [String]) throws -> SubjectAlternativeNames {
        var names: [GeneralName] = []
        for dns in dnsNames where !dns.isEmpty {
            names.append(.dnsName(dns))
        }
        for ip in ipAddresses where !ip.isEmpty {
            // Network framework is happy with IP-literal-as-DNS-name in many
            // dev contexts, but proper SAN-IPAddress is the real path. Use
            // both so curl / browsers from the Dell match either way.
            if let ipBytes = ipv4Bytes(ip) {
                names.append(.ipAddress(ASN1OctetString(contentBytes: ArraySlice(ipBytes))))
            }
            names.append(.dnsName(ip))
        }
        if names.isEmpty {
            names.append(.dnsName("localhost"))
        }
        return SubjectAlternativeNames(names)
    }

    private static func ipv4Bytes(_ s: String) -> [UInt8]? {
        let parts = s.split(separator: ".")
        guard parts.count == 4 else { return nil }
        var out: [UInt8] = []
        for p in parts {
            guard let v = UInt8(p) else { return nil }
            out.append(v)
        }
        return out
    }

    // MARK: - Lookup

    private static func lookupIdentity() throws -> NodeIdentity? {
        var ref: CFTypeRef?
        let status = SecItemCopyMatching([
            kSecClass as String: kSecClassIdentity,
            kSecAttrLabel as String: keyLabel,
            kSecReturnRef as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ] as CFDictionary, &ref)
        if status == errSecItemNotFound {
            return nil
        }
        guard status == errSecSuccess else {
            throw NodeIdentityError.keychainFailed(status, "SecItemCopyMatching identity")
        }
        guard CFGetTypeID(ref) == SecIdentityGetTypeID() else {
            return nil
        }
        let identity = ref as! SecIdentity

        var certOut: SecCertificate?
        let certStatus = SecIdentityCopyCertificate(identity, &certOut)
        guard certStatus == errSecSuccess, let secCert = certOut else {
            throw NodeIdentityError.keychainFailed(certStatus, "SecIdentityCopyCertificate")
        }
        let der = SecCertificateCopyData(secCert) as Data
        let digest = SHA256.hash(data: der)
        let fp = digest.map { String(format: "%02X", $0) }.joined(separator: ":")

        // Common name + SAN entries are reconstructed from the cert via
        // swift-certificates parsing.
        let parsed = (try? Certificate(derEncoded: Array(der)))
        let cn = parsed?.subject.description ?? "iHomeNerd-iOS"
        var dns: [String] = []
        var ips: [String] = []
        if let exts = parsed?.extensions {
            if let san = try? exts.subjectAlternativeNames {
                for n in san {
                    switch n {
                    case .dnsName(let s): dns.append(s)
                    case .ipAddress(let octets):
                        let bytes = Array(octets.bytes)
                        if bytes.count == 4 {
                            ips.append("\(bytes[0]).\(bytes[1]).\(bytes[2]).\(bytes[3])")
                        }
                    default: break
                    }
                }
            }
        }
        let createdAt = parsed?.notValidBefore ?? Date()
        return NodeIdentity(
            secIdentity: identity,
            secCertificate: secCert,
            certificateDER: der,
            fingerprintSHA256: fp,
            commonName: cn,
            dnsNames: dns,
            ipAddresses: ips,
            createdAt: createdAt
        )
    }
}
