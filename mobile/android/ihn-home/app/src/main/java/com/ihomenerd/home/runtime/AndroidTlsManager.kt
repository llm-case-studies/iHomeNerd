package com.ihomenerd.home.runtime

import android.content.Context
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.StringWriter
import java.math.BigInteger
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.SecureRandom
import java.security.Security
import java.security.cert.X509Certificate
import java.time.Instant
import java.time.temporal.ChronoUnit
import javax.net.ssl.KeyManagerFactory
import javax.net.ssl.SSLContext
import org.bouncycastle.asn1.x500.X500Name
import org.bouncycastle.asn1.x509.AuthorityKeyIdentifier
import org.bouncycastle.asn1.x509.BasicConstraints
import org.bouncycastle.asn1.x509.ExtendedKeyUsage
import org.bouncycastle.asn1.x509.Extension
import org.bouncycastle.asn1.x509.GeneralName
import org.bouncycastle.asn1.x509.GeneralNames
import org.bouncycastle.asn1.x509.KeyPurposeId
import org.bouncycastle.asn1.x509.KeyUsage
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter
import org.bouncycastle.cert.jcajce.JcaX509ExtensionUtils
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.bouncycastle.openssl.jcajce.JcaPEMWriter
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder
import org.json.JSONArray
import org.json.JSONObject

private data class AndroidCaMaterial(
    val privateKey: PrivateKey,
    val certificate: X509Certificate,
    val pem: String
)

private data class AndroidServerMaterial(
    val privateKey: PrivateKey,
    val certificate: X509Certificate
)

data class AndroidTlsMaterial(
    val sslContext: SSLContext,
    val caPem: String,
    val caCertificate: X509Certificate,
    val serverCertificate: X509Certificate
)

object AndroidTlsManager {
    private const val CA_ALIAS = "ihn-home-ca"
    private const val SERVER_ALIAS = "ihn-server"
    private const val CA_STORE_FILE = "home-ca.p12"
    private const val SERVER_STORE_FILE = "server-node.p12"
    private const val CA_CERT_FILE = "home-ca.crt"
    private const val STORE_PASSWORD = "ihomenerd-android"

    fun ensureMaterial(context: Context, nodeName: String, lanIps: List<String>): AndroidTlsMaterial {
        ensureProvider()
        val dir = certsDir(context)
        val ca = loadCaMaterial(dir) ?: generateCaMaterial(dir)
        val server = loadServerMaterial(dir)
            ?.takeIf { serverCertMatches(it.certificate, ca.certificate, nodeName, lanIps) }
            ?: generateServerMaterial(dir, ca, nodeName, lanIps)

        return AndroidTlsMaterial(
            sslContext = buildServerSslContext(ca, server),
            caPem = ca.pem,
            caCertificate = ca.certificate,
            serverCertificate = server.certificate
        )
    }

    fun trustStatusJson(context: Context, nodeName: String, preferredLanIp: String?, lanIps: List<String>): JSONObject {
        return try {
            val material = ensureMaterial(context, nodeName, lanIps)
            val hostnames = JSONArray().apply {
                desiredDnsNames(nodeName).forEach { put(it) }
                put("127.0.0.1")
                lanIps.filter { it.isNotBlank() }.forEach { put(it) }
            }

            JSONObject()
                .put("status", "trusted")
                .put("message", "Android Home CA and HTTPS server certificate are ready.")
                .put("lanIp", preferredLanIp ?: "")
                .put("lanIps", JSONArray(lanIps))
                .put("hostnames", hostnames)
                .put("homeCa", certificateJson(material.caCertificate, shared = false, subjectAltNames = emptyList()))
                .put(
                    "serverCert",
                    certificateJson(
                        material.serverCertificate,
                        shared = false,
                        subjectAltNames = readSubjectAltNames(material.serverCertificate)
                    )
                )
        } catch (exc: Exception) {
            JSONObject()
                .put("status", "missing_ca")
                .put("message", "Unable to prepare Android Home CA and HTTPS certificate: ${exc.message ?: exc.javaClass.simpleName}")
                .put("lanIp", preferredLanIp ?: "")
                .put("lanIps", JSONArray(lanIps))
                .put("hostnames", JSONArray())
                .put("homeCa", JSONObject().put("present", false))
                .put("serverCert", JSONObject().put("present", false))
        }
    }

    fun caCertificatePem(context: Context, nodeName: String, lanIps: List<String>): String {
        return ensureMaterial(context, nodeName, lanIps).caPem
    }

    private fun buildServerSslContext(ca: AndroidCaMaterial, server: AndroidServerMaterial): SSLContext {
        val store = KeyStore.getInstance("PKCS12").apply {
            load(null, null)
            setKeyEntry(
                SERVER_ALIAS,
                server.privateKey,
                STORE_PASSWORD.toCharArray(),
                arrayOf(server.certificate, ca.certificate)
            )
        }
        val keyManagerFactory = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm())
        keyManagerFactory.init(store, STORE_PASSWORD.toCharArray())

        return SSLContext.getInstance("TLS").apply {
            init(keyManagerFactory.keyManagers, null, SecureRandom())
        }
    }

    private fun certsDir(context: Context): File {
        return File(context.filesDir, "certs").apply { mkdirs() }
    }

    private fun loadCaMaterial(dir: File): AndroidCaMaterial? {
        val storeFile = File(dir, CA_STORE_FILE)
        val pemFile = File(dir, CA_CERT_FILE)
        if (!storeFile.exists() || !pemFile.exists()) return null
        val store = KeyStore.getInstance("PKCS12").apply {
            FileInputStream(storeFile).use { load(it, STORE_PASSWORD.toCharArray()) }
        }
        val privateKey = store.getKey(CA_ALIAS, STORE_PASSWORD.toCharArray()) as? PrivateKey ?: return null
        val certificate = store.getCertificate(CA_ALIAS) as? X509Certificate ?: return null
        return AndroidCaMaterial(privateKey, certificate, pemFile.readText())
    }

    private fun loadServerMaterial(dir: File): AndroidServerMaterial? {
        val storeFile = File(dir, SERVER_STORE_FILE)
        if (!storeFile.exists()) return null
        val store = KeyStore.getInstance("PKCS12").apply {
            FileInputStream(storeFile).use { load(it, STORE_PASSWORD.toCharArray()) }
        }
        val privateKey = store.getKey(SERVER_ALIAS, STORE_PASSWORD.toCharArray()) as? PrivateKey ?: return null
        val certificate = store.getCertificate(SERVER_ALIAS) as? X509Certificate ?: return null
        return AndroidServerMaterial(privateKey, certificate)
    }

    private fun generateCaMaterial(dir: File): AndroidCaMaterial {
        val now = Instant.now()
        val keyPair = generateRsaKeyPair()
        val subject = X500Name("CN=iHomeNerd Home CA,O=iHomeNerd")
        val serial = randomSerial()
        val extensionUtils = JcaX509ExtensionUtils()
        val builder = JcaX509v3CertificateBuilder(
            subject,
            serial,
            java.util.Date.from(now.minus(1, ChronoUnit.DAYS)),
            java.util.Date.from(now.plus(3650, ChronoUnit.DAYS)),
            subject,
            keyPair.public
        )
        builder.addExtension(Extension.basicConstraints, true, BasicConstraints(true))
        builder.addExtension(
            Extension.keyUsage,
            true,
            KeyUsage(KeyUsage.keyCertSign or KeyUsage.cRLSign)
        )
        builder.addExtension(
            Extension.subjectKeyIdentifier,
            false,
            extensionUtils.createSubjectKeyIdentifier(keyPair.public)
        )
        val signer = JcaContentSignerBuilder("SHA256withRSA").setProvider("BC").build(keyPair.private)
        val certificate = JcaX509CertificateConverter()
            .setProvider("BC")
            .getCertificate(builder.build(signer))
        certificate.verify(keyPair.public)

        val pem = certificateToPem(certificate)
        saveKeyStore(File(dir, CA_STORE_FILE), CA_ALIAS, keyPair.private, arrayOf(certificate))
        File(dir, CA_CERT_FILE).writeText(pem)
        return AndroidCaMaterial(keyPair.private, certificate, pem)
    }

    private fun generateServerMaterial(
        dir: File,
        ca: AndroidCaMaterial,
        nodeName: String,
        lanIps: List<String>
    ): AndroidServerMaterial {
        val now = Instant.now()
        val keyPair = generateRsaKeyPair()
        val subject = X500Name("CN=iHomeNerd Android Node,O=iHomeNerd")
        val caSubject = X500Name.getInstance(ca.certificate.subjectX500Principal.encoded)
        val serial = randomSerial()
        val extensionUtils = JcaX509ExtensionUtils()
        val builder = JcaX509v3CertificateBuilder(
            caSubject,
            serial,
            java.util.Date.from(now.minus(1, ChronoUnit.DAYS)),
            java.util.Date.from(now.plus(825, ChronoUnit.DAYS)),
            subject,
            keyPair.public
        )
        builder.addExtension(Extension.basicConstraints, true, BasicConstraints(false))
        builder.addExtension(
            Extension.keyUsage,
            true,
            KeyUsage(KeyUsage.digitalSignature or KeyUsage.keyEncipherment)
        )
        builder.addExtension(
            Extension.extendedKeyUsage,
            false,
            ExtendedKeyUsage(KeyPurposeId.id_kp_serverAuth)
        )
        builder.addExtension(
            Extension.subjectKeyIdentifier,
            false,
            extensionUtils.createSubjectKeyIdentifier(keyPair.public)
        )
        builder.addExtension(
            Extension.authorityKeyIdentifier,
            false,
            extensionUtils.createAuthorityKeyIdentifier(ca.certificate)
        )
        builder.addExtension(
            Extension.subjectAlternativeName,
            false,
            buildSubjectAltNames(nodeName, lanIps)
        )

        val signer = JcaContentSignerBuilder("SHA256withRSA").setProvider("BC").build(ca.privateKey)
        val certificate = JcaX509CertificateConverter()
            .setProvider("BC")
            .getCertificate(builder.build(signer))
        certificate.verify(ca.certificate.publicKey)

        saveKeyStore(
            File(dir, SERVER_STORE_FILE),
            SERVER_ALIAS,
            keyPair.private,
            arrayOf(certificate, ca.certificate)
        )
        return AndroidServerMaterial(keyPair.private, certificate)
    }

    private fun saveKeyStore(file: File, alias: String, privateKey: PrivateKey, chain: Array<X509Certificate>) {
        val store = KeyStore.getInstance("PKCS12").apply {
            load(null, null)
            setKeyEntry(alias, privateKey, STORE_PASSWORD.toCharArray(), chain)
        }
        FileOutputStream(file).use { output ->
            store.store(output, STORE_PASSWORD.toCharArray())
        }
    }

    private fun ensureProvider() {
        val existing = Security.getProvider("BC")
        if (existing == null || existing.javaClass.name != BouncyCastleProvider::class.java.name) {
            Security.removeProvider("BC")
            Security.addProvider(BouncyCastleProvider())
        }
    }

    private fun generateRsaKeyPair(): KeyPair {
        val generator = KeyPairGenerator.getInstance("RSA")
        generator.initialize(2048, SecureRandom())
        return generator.generateKeyPair()
    }

    private fun randomSerial(): BigInteger {
        return BigInteger(160, SecureRandom()).abs().takeIf { it > BigInteger.ZERO } ?: BigInteger.ONE
    }

    private fun buildSubjectAltNames(nodeName: String, lanIps: List<String>): GeneralNames {
        val names = mutableListOf<GeneralName>()
        desiredDnsNames(nodeName).forEach { names += GeneralName(GeneralName.dNSName, it) }
        desiredIpNames(lanIps).forEach { names += GeneralName(GeneralName.iPAddress, it) }
        return GeneralNames(names.toTypedArray())
    }

    private fun desiredDnsNames(nodeName: String): Set<String> {
        val safeNodeName = nodeName.trim()
            .replace("[^A-Za-z0-9.-]".toRegex(), "-")
            .replace("-+".toRegex(), "-")
            .trim('-')
            .ifBlank { "android-node" }
            .lowercase()
        return linkedSetOf("localhost", "ihomenerd.local", safeNodeName, "$safeNodeName.local")
    }

    private fun desiredIpNames(lanIps: List<String>): Set<String> {
        val names = linkedSetOf("127.0.0.1")
        lanIps.filter { it.isNotBlank() }.forEach { names += it }
        return names
    }

    private fun serverCertMatches(
        certificate: X509Certificate,
        caCertificate: X509Certificate,
        nodeName: String,
        lanIps: List<String>
    ): Boolean {
        val issuerMatches = certificate.issuerX500Principal == caCertificate.subjectX500Principal
        val signatureMatches = runCatching {
            certificate.verify(caCertificate.publicKey)
            true
        }.getOrDefault(false)
        val sans = readSubjectAltNames(certificate).toSet()
        val required = buildSet {
            desiredDnsNames(nodeName).forEach { add("DNS:$it") }
            desiredIpNames(lanIps).forEach { add("IP:$it") }
        }
        return issuerMatches && signatureMatches && required.all { it in sans }
    }

    private fun certificateToPem(certificate: X509Certificate): String {
        val writer = StringWriter()
        JcaPEMWriter(writer).use { pem ->
            pem.writeObject(certificate)
        }
        return writer.toString()
    }

    private fun readSubjectAltNames(certificate: X509Certificate): List<String> {
        val subjectAltNames = certificate.subjectAlternativeNames ?: return emptyList()
        return buildList {
            subjectAltNames.forEach { entry ->
                val type = entry.getOrNull(0) as? Int ?: return@forEach
                val value = entry.getOrNull(1)?.toString().orEmpty()
                when (type) {
                    2 -> add("DNS:$value")
                    7 -> add("IP:$value")
                }
            }
        }.sorted()
    }

    private fun fingerprintSha256(certificate: X509Certificate): String {
        val digest = java.security.MessageDigest.getInstance("SHA-256").digest(certificate.encoded)
        return digest.joinToString(":") { "%02X".format(it) }
    }

    private fun certificateJson(
        certificate: X509Certificate,
        shared: Boolean,
        subjectAltNames: List<String>
    ): JSONObject {
        return JSONObject()
            .put("present", true)
            .put("subject", certificate.subjectX500Principal.name)
            .put("issuer", certificate.issuerX500Principal.name)
            .put("fingerprintSha256", fingerprintSha256(certificate))
            .put("notBefore", certificate.notBefore.toString())
            .put("notAfter", certificate.notAfter.toString())
            .put("sans", JSONArray(subjectAltNames))
            .put("shared", shared)
    }
}
