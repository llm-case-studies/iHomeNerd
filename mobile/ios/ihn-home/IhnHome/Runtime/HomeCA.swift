import Foundation
import Security
import CryptoKit
import X509
import SwiftASN1

// Home CA = the trust anchor for an iHomeNerd household / classroom.
// Self-signed root, persisted once, then reused to sign per-node leaf
// certificates. Aligns with `docs/TRUST_AND_TLS_POLICY_2026-04-28.md` §2.1
// and mirrors the Android `AndroidTlsManager` reference implementation.
//
// The CA's job is to be stable: user installs it once (planned via
// .mobileconfig in a later phase), and after that any leaf cert this
// device serves chains back to a trust anchor the user already trusts.

struct HomeCA {
    let secKey: SecKey
    let secCertificate: SecCertificate
    let certificateDER: Data
    let certificatePEM: String
    let fingerprintSHA256: String   // hex, colon-separated, uppercase
    let subject: DistinguishedName
    let createdAt: Date
}

enum HomeCAStore {
    private static let keyLabel = "iHomeNerd-iOS-homeca-v1"
    private static let keyTag = "com.ihomenerd.home.homeca.key.v1".data(using: .utf8)!
    private static let certLabel = "iHomeNerd-iOS-homeca-cert-v1"

    static func loadOrCreate(commonName: String) throws -> HomeCA {
        if let existing = try lookupExisting() {
            return existing
        }
        return try generate(commonName: commonName)
    }

    static func reset() {
        let _ = SecItemDelete([
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: keyTag,
        ] as CFDictionary)
        let _ = SecItemDelete([
            kSecClass as String: kSecClassCertificate,
            kSecAttrLabel as String: certLabel,
        ] as CFDictionary)
    }

    private static func lookupExisting() throws -> HomeCA? {
        var certRef: CFTypeRef?
        let certStatus = SecItemCopyMatching([
            kSecClass as String: kSecClassCertificate,
            kSecAttrLabel as String: certLabel,
            kSecReturnRef as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ] as CFDictionary, &certRef)
        if certStatus == errSecItemNotFound { return nil }
        guard certStatus == errSecSuccess,
              CFGetTypeID(certRef) == SecCertificateGetTypeID() else {
            return nil
        }
        let secCert = certRef as! SecCertificate

        var keyRef: CFTypeRef?
        let keyStatus = SecItemCopyMatching([
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: keyTag,
            kSecAttrLabel as String: keyLabel,
            kSecReturnRef as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ] as CFDictionary, &keyRef)
        if keyStatus == errSecItemNotFound { return nil }
        guard keyStatus == errSecSuccess,
              CFGetTypeID(keyRef) == SecKeyGetTypeID() else {
            return nil
        }
        let key = keyRef as! SecKey

        return try buildHomeCA(secKey: key, secCert: secCert)
    }

    private static func generate(commonName: String) throws -> HomeCA {
        // Same v4 transient-then-persist pattern that fixed leaf signing —
        // SecKeyCreateRandomKey with kSecAttrIsPermanent strips signing
        // capability. Generate transient first, then add via SecItemAdd.
        let transientAttrs: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
        ]
        var error: Unmanaged<CFError>?
        guard let key = SecKeyCreateRandomKey(transientAttrs as CFDictionary, &error) else {
            let msg = (error?.takeRetainedValue()).map { "\($0)" } ?? "nil error"
            throw NodeIdentityError.keyGenerationFailed("HomeCA: \(msg)")
        }

        let addKeyStatus = SecItemAdd([
            kSecClass as String: kSecClassKey,
            kSecValueRef as String: key,
            kSecAttrApplicationTag as String: keyTag,
            kSecAttrLabel as String: keyLabel,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            kSecAttrIsPermanent as String: true,
            kSecAttrCanSign as String: true,
            kSecAttrCanVerify as String: true,
        ] as CFDictionary, nil)
        guard addKeyStatus == errSecSuccess || addKeyStatus == errSecDuplicateItem else {
            throw NodeIdentityError.keychainFailed(addKeyStatus, "SecItemAdd HomeCA key")
        }

        let certKey = try Certificate.PrivateKey(key)
        let subject = try DistinguishedName {
            CommonName(commonName)
            OrganizationName("iHomeNerd")
            OrganizationalUnitName("Home CA")
        }
        let now = Date()
        let notBefore = now.addingTimeInterval(-60)
        // 10y validity for the trust anchor — leaf certs rotate, CA stays put.
        let notAfter = now.addingTimeInterval(60 * 60 * 24 * 365 * 10)

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
                Critical(BasicConstraints.isCertificateAuthority(maxPathLength: 0))
                Critical(KeyUsage(digitalSignature: true,
                                  keyCertSign: true,
                                  cRLSign: true))
            },
            issuerPrivateKey: certKey
        )

        var serializer = DER.Serializer()
        do {
            try serializer.serialize(cert)
        } catch {
            throw NodeIdentityError.certEncodingFailed("HomeCA: \(error)")
        }
        let der = Data(serializer.serializedBytes)
        guard let secCert = SecCertificateCreateWithData(nil, der as CFData) else {
            throw NodeIdentityError.certEncodingFailed("HomeCA SecCertificateCreateWithData nil")
        }

        let addCertStatus = SecItemAdd([
            kSecClass as String: kSecClassCertificate,
            kSecValueRef as String: secCert,
            kSecAttrLabel as String: certLabel,
        ] as CFDictionary, nil)
        guard addCertStatus == errSecSuccess || addCertStatus == errSecDuplicateItem else {
            throw NodeIdentityError.keychainFailed(addCertStatus, "SecItemAdd HomeCA cert")
        }

        return try buildHomeCA(secKey: key, secCert: secCert)
    }

    private static func buildHomeCA(secKey: SecKey, secCert: SecCertificate) throws -> HomeCA {
        let der = SecCertificateCopyData(secCert) as Data
        let digest = SHA256.hash(data: der)
        let fp = digest.map { String(format: "%02X", $0) }.joined(separator: ":")
        let pem = pemEncode(der: der)

        let parsed = try Certificate(derEncoded: Array(der))
        return HomeCA(
            secKey: secKey,
            secCertificate: secCert,
            certificateDER: der,
            certificatePEM: pem,
            fingerprintSHA256: fp,
            subject: parsed.subject,
            createdAt: parsed.notValidBefore
        )
    }

    private static func pemEncode(der: Data) -> String {
        let b64 = der.base64EncodedString()
        var lines: [String] = ["-----BEGIN CERTIFICATE-----"]
        var idx = b64.startIndex
        while idx < b64.endIndex {
            let end = b64.index(idx, offsetBy: 64, limitedBy: b64.endIndex) ?? b64.endIndex
            lines.append(String(b64[idx..<end]))
            idx = end
        }
        lines.append("-----END CERTIFICATE-----")
        return lines.joined(separator: "\n") + "\n"
    }
}
