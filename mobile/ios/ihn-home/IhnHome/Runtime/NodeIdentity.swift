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
    // Result of a SecKeyCreateSignature pre-flight against the resolved
    // SecIdentity's private key. Either "OK (<n> bytes)" or a reason.
    // Surfaced on the Node screen so we can tell whether keychain signing
    // is the missing link behind errSSLHandshakeFail.
    let signingPreflight: String
}

enum NodeIdentityStore {
    // v5: leaf is now signed by the Home CA (HomeCAStore), not self-signed.
    // The leaf is also regenerated every session so its SAN tracks current
    // LAN IPs. v4 kept the same persistence trick (transient SecKeyCreateRandomKey
    // + explicit SecItemAdd with kSecAttrCanSign/kSecAttrCanVerify) which was
    // the fix for errSSLHandshakeFail/errSecParam(-50).
    private static let keyLabel = "iHomeNerd-iOS-runtime-v5"
    private static let keyTag = "com.ihomenerd.home.runtime.key.v5".data(using: .utf8)!

    static func generateFresh(commonName: String,
                              dnsNames: [String],
                              ipAddresses: [String],
                              ca: HomeCA) throws -> NodeIdentity {
        // Always regenerate the leaf so its SAN matches the current network.
        // Delete any prior v5 leaf cert + key first so SecItemAdd doesn't
        // dedupe and leave us with a stale identity.
        try reset()
        return try generate(commonName: commonName,
                            dnsNames: dnsNames,
                            ipAddresses: ipAddresses,
                            ca: ca)
    }

    static func reset() throws {
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
                                 ipAddresses: [String],
                                 ca: HomeCA) throws -> NodeIdentity {
        // 1. Generate persistent EC P-256 SecKey for the leaf.
        let secKey = try generateSecKey()

        // 2. Wrap leaf SecKey + CA SecKey for swift-certificates.
        let leafKey = try Certificate.PrivateKey(secKey)
        let caKey = try Certificate.PrivateKey(ca.secKey)

        // 3. Build CA-signed leaf cert.
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
            publicKey: leafKey.publicKey,
            notValidBefore: notBefore,
            notValidAfter: notAfter,
            issuer: ca.subject,
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
            issuerPrivateKey: caKey
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

        // 5. Add cert to keychain. The matching leaf key is already there
        //    (added via SecItemAdd in generateSecKey), so SecIdentity machinery
        //    links them by public-key hash on lookup.
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
        // Step 1: generate transient (no kSecAttrIsPermanent, no tag/label).
        // The transient key carries full sign/verify capability; persistence
        // attrs go in step 2 instead. This works around the SecKeyCreateRandomKey
        // bug where isPermanent strips signing capability from the resulting key.
        let transientAttrs: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
        ]
        var error: Unmanaged<CFError>?
        guard let key = SecKeyCreateRandomKey(transientAttrs as CFDictionary, &error) else {
            let msg = (error?.takeRetainedValue()).map { "\($0)" } ?? "nil error"
            throw NodeIdentityError.keyGenerationFailed(msg)
        }

        // Step 2: persist the transient key via SecItemAdd with explicit
        // signing-capability attrs.
        let addStatus = SecItemAdd([
            kSecClass as String: kSecClassKey,
            kSecValueRef as String: key,
            kSecAttrApplicationTag as String: keyTag,
            kSecAttrLabel as String: keyLabel,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            kSecAttrIsPermanent as String: true,
            kSecAttrCanSign as String: true,
            kSecAttrCanVerify as String: true,
        ] as CFDictionary, nil)
        guard addStatus == errSecSuccess || addStatus == errSecDuplicateItem else {
            throw NodeIdentityError.keychainFailed(addStatus, "SecItemAdd key")
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
        let preflight = signingPreflight(for: identity)
        return NodeIdentity(
            secIdentity: identity,
            secCertificate: secCert,
            certificateDER: der,
            fingerprintSHA256: fp,
            commonName: cn,
            dnsNames: dns,
            ipAddresses: ips,
            createdAt: createdAt,
            signingPreflight: preflight
        )
    }

    // Confirm the SecIdentity's private key can actually sign for TLS.
    // Tries digest-style first (what Network.framework's TLS handshake uses
    // internally — sign a SHA-256 digest), then message-style as a fallback.
    // The two-line label distinguishes which form succeeded so we can tell
    // whether key signing is the bottleneck or the TLS failure is downstream.
    private static func signingPreflight(for identity: SecIdentity) -> String {
        var keyOut: SecKey?
        let status = SecIdentityCopyPrivateKey(identity, &keyOut)
        guard status == errSecSuccess, let key = keyOut else {
            return "SecIdentityCopyPrivateKey \(status)"
        }
        let supportsDigest = SecKeyIsAlgorithmSupported(key, .sign, .ecdsaSignatureDigestX962SHA256)
        let supportsMessage = SecKeyIsAlgorithmSupported(key, .sign, .ecdsaSignatureMessageX962SHA256)
        let supportTag = "supports[d=\(supportsDigest ? "Y" : "N") m=\(supportsMessage ? "Y" : "N")]"

        let testMsg = "ihn-tls-preflight".data(using: .utf8)!
        let digest = Data(SHA256.hash(data: testMsg))

        var sigErr: Unmanaged<CFError>?
        if let sig = SecKeyCreateSignature(
            key,
            .ecdsaSignatureDigestX962SHA256,
            digest as CFData,
            &sigErr
        ) {
            return "OK digest (\((sig as Data).count) B) \(supportTag)"
        }
        let digestErr = signingPreflightShortError(sigErr)

        sigErr = nil
        if let sig = SecKeyCreateSignature(
            key,
            .ecdsaSignatureMessageX962SHA256,
            testMsg as CFData,
            &sigErr
        ) {
            return "OK message (\((sig as Data).count) B) \(supportTag) digest=\(digestErr)"
        }
        let msgErr = signingPreflightShortError(sigErr)
        return "FAIL \(supportTag) digest=\(digestErr) message=\(msgErr)"
    }

    private static func signingPreflightShortError(_ unmanaged: Unmanaged<CFError>?) -> String {
        guard let cfErr = unmanaged?.takeRetainedValue() else { return "[no error]" }
        let ns = cfErr as Error as NSError
        let one = ns.localizedDescription
            .replacingOccurrences(of: "\n", with: " ")
            .prefix(80)
        return "[\(ns.domain) \(ns.code): \(one)]"
    }
}
