package com.ihomenerd.home.data

import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import javax.net.ssl.SSLHandshakeException

data class GatewaySnapshot(
    val baseUrl: String,
    val discovery: DiscoveryInfo? = null,
    val health: HealthInfo? = null,
    val capabilities: CapabilitiesInfo? = null,
    val cluster: ClusterInfo? = null,
    val trust: TrustInfo? = null,
    val system: SystemStats? = null,
    val warnings: List<String> = emptyList()
)

data class DiscoveryInfo(
    val hostname: String,
    val ip: String,
    val port: Int,
    val os: String,
    val arch: String,
    val gpuName: String? = null,
    val gpuVramMb: Int? = null,
    val ramBytes: Long? = null,
    val suggestedRoles: List<String> = emptyList(),
    val strengths: List<String> = emptyList(),
    val models: List<String> = emptyList(),
    val ollamaReady: Boolean = false
)

data class HealthInfo(
    val ok: Boolean,
    val hostname: String,
    val version: String,
    val port: Int,
    val capabilityModels: Map<String, String>
)

data class CapabilityModeInfo(
    val id: String,
    val label: String,
    val available: Boolean,
    val note: String? = null
)

data class CapabilityInfo(
    val name: String,
    val title: String,
    val available: Boolean,
    val implementation: String? = null,
    val backend: String? = null,
    val tier: String? = null,
    val latencyClass: String? = null,
    val offline: Boolean = false,
    val streaming: Boolean = false,
    val packName: String? = null,
    val loadState: String? = null,
    val languages: List<String> = emptyList(),
    val qualityModes: List<CapabilityModeInfo> = emptyList(),
    val note: String? = null
)

data class CapabilitiesInfo(
    val flat: Map<String, Boolean>,
    val qualityProfiles: List<String> = emptyList(),
    val details: Map<String, CapabilityInfo> = emptyMap()
)

data class ClusterInfo(
    val gatewayUrl: String?,
    val nodes: List<ClusterNode>
)

data class ClusterNode(
    val hostname: String,
    val ip: String,
    val os: String? = null,
    val arch: String? = null,
    val roles: List<String> = emptyList(),
    val strengths: List<String> = emptyList(),
    val models: List<String> = emptyList(),
    val managedState: String? = null,
    val runtimeKind: String? = null,
    val offline: Boolean = false
)

data class TrustInfo(
    val status: String,
    val message: String,
    val lanIp: String? = null,
    val hostnames: List<String> = emptyList(),
    val homeCa: CertificateInfo? = null,
    val serverCert: CertificateInfo? = null
)

data class CertificateInfo(
    val present: Boolean,
    val subject: String = "",
    val issuer: String = "",
    val fingerprintSha256: String = "",
    val notAfter: String = "",
    val sans: List<String> = emptyList(),
    val shared: Boolean = false
)

data class SystemStats(
    val uptimeSeconds: Long,
    val sessionCount: Int,
    val batteryPercent: Int? = null,
    val freeStorageBytes: Long? = null,
    val totalStorageBytes: Long? = null,
    val totalRamBytes: Long? = null,
    val connectedClients: List<ConnectedClient> = emptyList(),
    val connectedApps: List<ConnectedApp>
)

data class ConnectedApp(
    val name: String,
    val activeSessions: Int,
    val lastSeen: String? = null
)

data class ConnectedClient(
    val ip: String,
    val label: String,
    val requestCount: Int,
    val lastSeen: String? = null,
    val lastPath: String? = null,
    val userAgent: String? = null
)

class GatewayFetchException(message: String, cause: Throwable? = null) : Exception(message, cause)

class IhnGatewayRepository {
    fun normalizeBaseUrl(raw: String): String {
        val trimmed = raw.trim()
        if (trimmed.isBlank()) return ""
        val withScheme = if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            trimmed
        } else {
            "http://$trimmed"
        }
        return withScheme.removeSuffix("/")
    }

    fun commandCenterUrl(baseUrl: String, snapshot: GatewaySnapshot?): String? {
        snapshot?.cluster?.gatewayUrl?.takeIf { it.isNotBlank() }?.let { return it }
        val normalized = normalizeBaseUrl(baseUrl)
        if (normalized.isBlank()) return null
        return try {
            val uri = URI(normalized)
            val host = uri.host ?: return null
            "https://$host:17777"
        } catch (_: Exception) {
            null
        }
    }

    fun setupUrl(baseUrl: String): String? {
        val normalized = normalizeBaseUrl(baseUrl)
        if (normalized.isBlank()) return null
        return try {
            val uri = URI(normalized)
            val host = uri.host ?: return null
            "http://$host:17778/setup"
        } catch (_: Exception) {
            null
        }
    }

    fun load(baseUrl: String): GatewaySnapshot {
        val normalized = normalizeBaseUrl(baseUrl)
        if (normalized.isBlank()) {
            throw GatewayFetchException("Enter a gateway URL first.")
        }

        val warnings = mutableListOf<String>()

        val discovery = runFetch("discover", normalized, warnings) { parseDiscovery(it) }
        val health = runFetch("health", normalized, warnings) { parseHealth(it) }
        val capabilities = runFetch("capabilities", normalized, warnings) { parseCapabilities(it) }
        val cluster = runFetch("cluster/nodes", normalized, warnings) { parseCluster(it) }
        val trust = runFetch("setup/trust-status", normalized, warnings) { parseTrust(it) }
        val system = runFetch("system/stats", normalized, warnings) { parseSystem(it) }

        if (discovery == null && health == null && capabilities == null && cluster == null && trust == null && system == null) {
            val hint = warnings.firstOrNull() ?: "Unable to reach the gateway."
            throw GatewayFetchException(hint)
        }

        return GatewaySnapshot(
            baseUrl = normalized,
            discovery = discovery,
            health = health,
            capabilities = capabilities,
            cluster = cluster,
            trust = trust,
            system = system,
            warnings = warnings
        )
    }

    private fun <T> runFetch(
        path: String,
        baseUrl: String,
        warnings: MutableList<String>,
        parse: (JSONObject) -> T
    ): T? {
        return try {
            parse(fetchJson("$baseUrl/$path"))
        } catch (exc: SSLHandshakeException) {
            warnings += "TLS trust is not established yet. Use the HTTP setup port (:17778) first."
            null
        } catch (exc: Exception) {
            warnings += "${path.substringAfterLast('/')}: ${exc.message ?: exc.javaClass.simpleName}"
            null
        }
    }

    private fun fetchJson(url: String): JSONObject {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 3000
            readTimeout = 5000
            requestMethod = "GET"
            setRequestProperty("Accept", "application/json")
        }

        return try {
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val body = BufferedReader(InputStreamReader(stream)).use { reader ->
                reader.readText()
            }
            if (code !in 200..299) {
                throw GatewayFetchException("HTTP $code from $url")
            }
            JSONObject(body)
        } finally {
            conn.disconnect()
        }
    }

    private fun parseDiscovery(json: JSONObject): DiscoveryInfo {
        val gpu = json.optJSONObject("gpu")
        return DiscoveryInfo(
            hostname = json.optString("hostname"),
            ip = json.optString("ip"),
            port = json.optInt("port", 17777),
            os = json.optString("os"),
            arch = json.optString("arch"),
            gpuName = gpu?.optString("name")?.takeIf { it.isNotBlank() },
            gpuVramMb = gpu?.optInt("vram_mb")?.takeIf { it > 0 },
            ramBytes = json.optLong("ram_bytes").takeIf { it > 0L },
            suggestedRoles = json.optJsonArray("suggested_roles"),
            strengths = json.optJsonArray("strengths"),
            models = json.optJsonArray("models"),
            ollamaReady = json.optBoolean("ollama", false)
        )
    }

    private fun parseHealth(json: JSONObject): HealthInfo {
        val models = mutableMapOf<String, String>()
        val modelJson = json.optJSONObject("models")
        if (modelJson != null) {
            modelJson.keys().forEach { key ->
                models[key] = modelJson.optString(key)
            }
        }
        return HealthInfo(
            ok = json.optBoolean("ok", false),
            hostname = json.optString("hostname"),
            version = json.optString("version"),
            port = json.optInt("port", 17777),
            capabilityModels = models
        )
    }

    private fun parseCapabilities(json: JSONObject): CapabilitiesInfo {
        val flat = mutableMapOf<String, Boolean>()
        json.optJSONObject("capabilities")?.keys()?.forEach { key ->
            flat[key] = json.optJSONObject("capabilities")?.optBoolean(key, false) ?: false
        }

        val detailRoot = json.optJSONObject("_detail")
        val nodeProfile = detailRoot?.optJSONObject("node_profile")
        val detailJson = detailRoot?.optJSONObject("capabilities")
        val details = buildMap {
            detailJson?.keys()?.forEach { key ->
                val item = detailJson.optJSONObject(key) ?: return@forEach
                put(
                    key,
                    CapabilityInfo(
                        name = key,
                        title = item.optString("title").ifBlank { key },
                        available = item.optBoolean("available", flat[key] == true),
                        implementation = item.optNullableString("implementation"),
                        backend = item.optNullableString("backend"),
                        tier = item.optNullableString("tier"),
                        latencyClass = item.optNullableString("latency_class"),
                        offline = item.optBoolean("offline", false),
                        streaming = item.optBoolean("streaming", false),
                        packName = item.optNullableString("pack_name"),
                        loadState = item.optNullableString("load_state"),
                        languages = item.optJsonArray("languages"),
                        qualityModes = item.optJSONArray("quality_modes").toModeList(),
                        note = item.optNullableString("note")
                    )
                )
            }
        }

        return CapabilitiesInfo(
            flat = flat,
            qualityProfiles = nodeProfile?.optJsonArray("quality_profiles").orEmpty(),
            details = details
        )
    }

    private fun parseCluster(json: JSONObject): ClusterInfo {
        val gateway = json.optJSONObject("gateway")
        val nodesArray = json.optJSONArray("nodes") ?: JSONArray()
        val nodes = buildList {
            for (i in 0 until nodesArray.length()) {
                val item = nodesArray.optJSONObject(i) ?: continue
                val managed = item.optJSONObject("managedNode")
                add(
                    ClusterNode(
                        hostname = item.optString("hostname"),
                        ip = item.optString("ip"),
                        os = item.optString("os").takeIf { it.isNotBlank() },
                        arch = item.optString("arch").takeIf { it.isNotBlank() },
                        roles = item.optJsonArray("suggested_roles"),
                        strengths = item.optJsonArray("strengths"),
                        models = item.optJsonArray("models"),
                        managedState = managed?.optString("state")?.takeIf { it.isNotBlank() },
                        runtimeKind = managed?.optString("runtimeKind")?.takeIf { it.isNotBlank() },
                        offline = item.optBoolean("offline", false)
                    )
                )
            }
        }
        return ClusterInfo(
            gatewayUrl = gateway?.optString("url")?.takeIf { it.isNotBlank() },
            nodes = nodes
        )
    }

    private fun parseTrust(json: JSONObject): TrustInfo {
        return TrustInfo(
            status = json.optString("status"),
            message = json.optString("message"),
            lanIp = json.optString("lanIp").takeIf { it.isNotBlank() },
            hostnames = json.optJsonArray("hostnames"),
            homeCa = json.optJSONObject("homeCa")?.let { parseCertificate(it) },
            serverCert = json.optJSONObject("serverCert")?.let { parseCertificate(it) }
        )
    }

    private fun parseCertificate(json: JSONObject): CertificateInfo {
        return CertificateInfo(
            present = json.optBoolean("present", false),
            subject = json.optString("subject"),
            issuer = json.optString("issuer"),
            fingerprintSha256 = json.optString("fingerprintSha256"),
            notAfter = json.optString("notAfter"),
            sans = json.optJsonArray("sans"),
            shared = json.optBoolean("shared", false)
        )
    }

    private fun parseSystem(json: JSONObject): SystemStats {
        val clients = buildList {
            val connected = json.optJSONArray("connected_clients") ?: JSONArray()
            for (i in 0 until connected.length()) {
                val item = connected.optJSONObject(i) ?: continue
                add(
                    ConnectedClient(
                        ip = item.optString("ip"),
                        label = item.optString("label").ifBlank { item.optString("ip") },
                        requestCount = item.optInt("request_count"),
                        lastSeen = item.optNullableString("last_seen"),
                        lastPath = item.optNullableString("last_path"),
                        userAgent = item.optNullableString("user_agent")
                    )
                )
            }
        }
        val apps = buildList {
            val connected = json.optJSONArray("connected_apps") ?: JSONArray()
            for (i in 0 until connected.length()) {
                val item = connected.optJSONObject(i) ?: continue
                add(
                    ConnectedApp(
                        name = item.optString("name"),
                        activeSessions = item.optInt("active_sessions"),
                        lastSeen = item.optString("last_seen").takeIf { it.isNotBlank() }
                    )
                )
            }
        }
        return SystemStats(
            uptimeSeconds = json.optLong("uptime_seconds"),
            sessionCount = json.optInt("session_count"),
            batteryPercent = json.optInt("battery_percent").takeIf { it > 0 },
            freeStorageBytes = json.optLong("free_storage_bytes").takeIf { it > 0L },
            totalStorageBytes = json.optLong("total_storage_bytes").takeIf { it > 0L },
            totalRamBytes = json.optLong("total_ram_bytes").takeIf { it > 0L },
            connectedClients = clients,
            connectedApps = apps
        )
    }

    private fun JSONObject.optJsonArray(key: String): List<String> {
        val array = optJSONArray(key) ?: return emptyList()
        return array.toList()
    }

    private fun JSONObject.optNullableString(key: String): String? {
        val value = optString(key)
        return value.takeIf { it.isNotBlank() && it != "null" }
    }

    private fun JSONArray?.toModeList(): List<CapabilityModeInfo> {
        val array = this ?: return emptyList()
        return buildList {
            for (i in 0 until array.length()) {
                val item = array.optJSONObject(i) ?: continue
                add(
                    CapabilityModeInfo(
                        id = item.optString("id"),
                        label = item.optString("label"),
                        available = item.optBoolean("available", false),
                        note = item.optNullableString("note")
                    )
                )
            }
        }
    }

    private fun JSONArray.toList(): List<String> = buildList {
        for (i in 0 until length()) {
            val value = optString(i)
            if (value.isNotBlank()) add(value)
        }
    }
}
