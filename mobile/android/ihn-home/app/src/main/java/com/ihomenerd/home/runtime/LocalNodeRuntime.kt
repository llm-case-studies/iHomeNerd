package com.ihomenerd.home.runtime

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import android.os.Process
import android.os.StatFs
import android.os.SystemClock
import android.util.Base64
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.Inet4Address
import java.net.InetAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.util.Collections
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean
import javax.net.ssl.SSLServerSocket

private fun defaultLocalNodeName(): String {
    return Build.MODEL
        ?.replace("\\s+".toRegex(), "-")
        ?.lowercase()
        ?.ifBlank { fallbackLocalNodeName() }
        ?: fallbackLocalNodeName()
}

private fun fallbackLocalNodeName(): String = "android-node-${UUID.randomUUID().toString().take(6)}"

data class CapabilityMode(
    val id: String,
    val label: String,
    val available: Boolean = true,
    val note: String = ""
)

data class LocalCapabilityProfile(
    val name: String,
    val title: String,
    val implementation: String,
    val backend: String,
    val tier: String,
    val latencyClass: String,
    val offline: Boolean = true,
    val streaming: Boolean = false,
    val languages: List<String> = emptyList(),
    val modes: List<CapabilityMode> = emptyList(),
    val note: String = ""
)

private fun defaultLocalPacks(): List<LocalPack> = listOf(
    LocalPack(
        id = "pronunco-pinyin-tools",
        name = "PronunCo Pinyin Tools",
        kind = "tool-pack",
        capabilityProfiles = listOf(
            LocalCapabilityProfile(
                name = "normalize_pinyin",
                title = "Normalize Pinyin",
                implementation = "pronunco_pinyin_tools",
                backend = "kotlin_local",
                tier = "tool",
                latencyClass = "realtime",
                languages = listOf("zh", "pinyin"),
                modes = listOf(
                    CapabilityMode(
                        id = "deterministic",
                        label = "Deterministic",
                        note = "Rule-based normalization with no model dependency."
                    )
                ),
                note = "Normalizes spacing, tone marks, and numeric tone forms for Mandarin pinyin."
            ),
            LocalCapabilityProfile(
                name = "compare_pinyin",
                title = "Compare Pinyin",
                implementation = "pronunco_pinyin_tools",
                backend = "kotlin_local",
                tier = "tool",
                latencyClass = "realtime",
                languages = listOf("zh", "pinyin"),
                modes = listOf(
                    CapabilityMode(
                        id = "deterministic",
                        label = "Deterministic",
                        note = "Tone-aware syllable comparison with stable scoring."
                    )
                ),
                note = "Compares expected and actual pinyin syllables without needing an LLM."
            )
        ),
        loaded = true,
        loadable = false,
        note = "Real local helper pack for pinyin normalization and tone-aware comparison."
    ),
    LocalPack(
        id = "android-tts-local",
        name = "Android TTS Local",
        kind = "service-pack",
        capabilityProfiles = listOf(
            LocalCapabilityProfile(
                name = "synthesize_speech",
                title = "Synthesize Speech",
                implementation = "android_text_to_speech",
                backend = "android_tts_service",
                tier = "tts",
                latencyClass = "interactive",
                languages = listOf("system-locales"),
                modes = listOf(
                    CapabilityMode(
                        id = "fast",
                        label = "Fast",
                        note = "Uses the Android device's installed voice data for low-latency local playback."
                    )
                ),
                note = "Real local speech synthesis through Android TextToSpeech."
            )
        ),
        loaded = true,
        loadable = false,
        note = "Uses Android system TTS and installed voice packs instead of browser speech synthesis."
    ),
    LocalPack(
        id = "android-gemma-chat-local",
        name = "Android Gemma Chat Local",
        kind = "model-pack",
        capabilityProfiles = listOf(
            LocalCapabilityProfile(
                name = "chat",
                title = "Chat",
                implementation = "android_gemma_local",
                backend = "android_gemma_local",
                tier = "light",
                latencyClass = "interactive",
                offline = true,
                languages = listOf("multilingual-prompted"),
                modes = listOf(
                    CapabilityMode(
                        id = "fast",
                        label = "Fast",
                        note = "Small local Gemma path for quick single-user dialogue turns on this Android device through LiteRT-LM."
                    ),
                    CapabilityMode(
                        id = "balanced",
                        label = "Balanced",
                        note = "Uses a sideloaded Gemma LiteRT-LM model on-device when the pack is loaded and runtime initialization succeeds."
                    )
                ),
                note = "Real on-device Gemma chat path using LiteRT-LM with sideloaded `.litertlm` models."
            )
        ),
        loaded = false,
        loadable = true,
        note = "Experimental on-device Gemma chat backend using LiteRT-LM. Requires pack load plus a compatible sideloaded model file."
    ),
    LocalPack(
        id = "translate-small-preview",
        name = "Translate Small (preview)",
        kind = "model-pack",
        capabilityProfiles = listOf(
            LocalCapabilityProfile(
                name = "translate_text",
                title = "Translate Text",
                implementation = "translate_small_preview",
                backend = "kotlin_local_preview",
                tier = "light",
                latencyClass = "interactive",
                languages = listOf("zh->en", "en->zh"),
                modes = listOf(
                    CapabilityMode(
                        id = "fast",
                        label = "Fast",
                        note = "Tiny phrasebook-style preview for short supported phrases."
                    )
                ),
                note = "Preview path for small on-device translation before a real runtime lands."
            )
        ),
        loaded = false,
        loadable = true,
        note = "Planned on-device translation pack."
    ),
    LocalPack(
        id = "android-asr-local",
        name = "Android ASR Local",
        kind = "service-pack",
        capabilityProfiles = listOf(
            LocalCapabilityProfile(
                name = "transcribe_audio",
                title = "Transcribe Audio",
                implementation = "sherpa_onnx_moonshine",
                backend = "sherpa_onnx_moonshine",
                tier = "transcription",
                latencyClass = "interactive",
                offline = true,
                languages = listOf("en-US", "es-ES"),
                modes = listOf(
                    CapabilityMode(
                        id = "fast",
                        label = "Fast",
                        note = "Routes short uploaded utterances into local Moonshine speech models on this Android device."
                    ),
                    CapabilityMode(
                        id = "balanced",
                        label = "Balanced",
                        note = "Supports English and Spanish on-device with more stable behavior than the platform recognizer path."
                    )
                ),
                note = "Real Android-hosted ASR path using Sherpa ONNX Moonshine models for browser-uploaded speech."
            )
        ),
        loaded = true,
        loadable = false,
        note = "Uses Sherpa ONNX Moonshine speech models on the Android node instead of browser-side transcription."
    )
)

data class LocalPack(
    val id: String,
    val name: String,
    val kind: String,
    val capabilityProfiles: List<LocalCapabilityProfile>,
    val loaded: Boolean,
    val loadable: Boolean = true,
    val note: String
) {
    val capabilities: List<String>
        get() = capabilityProfiles.map { it.name }
}

data class RemoteClient(
    val address: String,
    val label: String,
    val requestCount: Int,
    val lastSeenMillis: Long,
    val lastPath: String? = null,
    val userAgent: String? = null
)

data class LocalRuntimeState(
    val running: Boolean = false,
    val port: Int = LocalNodeRuntime.PORT,
    val localIp: String? = null,
    val localIps: List<String> = emptyList(),
    val localNetworkTransport: String? = null,
    val localNetworkHint: String? = null,
    val startedAtMillis: Long? = null,
    val nodeName: String = defaultLocalNodeName(),
    val sessionCount: Int = 0,
    val pronuncoRequests: Int = 0,
    val chatRequests: Int = 0,
    val ttsRequests: Int = 0,
    val asrRequests: Int = 0,
    val lastChatDurationMs: Long? = null,
    val lastChatPromptChars: Int? = null,
    val lastChatResponseChars: Int? = null,
    val lastChatBackend: String? = null,
    val lastChatModelId: String? = null,
    val lastChatLanguageTag: String? = null,
    val lastChatAtMillis: Long? = null,
    val lastAsrDurationMs: Long? = null,
    val lastAsrAudioBytes: Int? = null,
    val lastAsrBackend: String? = null,
    val lastAsrLanguageTag: String? = null,
    val lastAsrAtMillis: Long? = null,
    val lastTtsDurationMs: Long? = null,
    val lastTtsAudioBytes: Int? = null,
    val lastTtsVoice: String? = null,
    val lastTtsLanguageTag: String? = null,
    val lastTtsAtMillis: Long? = null,
    val packs: List<LocalPack> = defaultLocalPacks(),
    val remoteClients: List<RemoteClient> = emptyList(),
    val lastError: String? = null,
    val isCharging: Boolean? = null,
    val chargingSource: String? = null,
    val isBatteryOptimizationExempt: Boolean? = null
)

private data class CapabilityStatus(
    val profile: LocalCapabilityProfile,
    val packId: String,
    val packName: String,
    val packKind: String,
    val packNote: String,
    val available: Boolean,
    val loadable: Boolean,
    val loadState: String
)

private data class NetworkSnapshot(
    val preferredIp: String?,
    val addresses: List<String>,
    val transport: String?,
    val interfaceNames: List<String>,
    val reachabilityHint: String
)

private data class CpuSample(
    val wallMs: Long,
    val processCpuMs: Long
)

object LocalNodeRuntime {
    private const val VERSION = "0.1.0-dev-android"
    const val PORT = 17777
    const val SETUP_PORT = 17778
    private const val PRODUCT = "iHomeNerd"
    private const val PREFS_NAME = "ihn-local-runtime"
    private const val KEY_LOADED_PACKS = "loaded_pack_ids"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val running = AtomicBoolean(false)
    private val restartingForNetworkChange = AtomicBoolean(false)
    private val _state = MutableStateFlow(LocalRuntimeState())
    val state: StateFlow<LocalRuntimeState> = _state

    private var secureServerSocket: ServerSocket? = null
    private var setupServerSocket: ServerSocket? = null
    private var appContext: Context? = null
    private var tlsMaterial: AndroidTlsMaterial? = null
    private var lastCpuSample: CpuSample? = null

    fun start(context: Context) {
        appContext = context.applicationContext
        restorePersistedState()
        if (!running.compareAndSet(false, true)) return
        lastCpuSample = CpuSample(
            wallMs = SystemClock.elapsedRealtime(),
            processCpuMs = Process.getElapsedCpuTime()
        )
        val network = detectNetworkSnapshot()
        tlsMaterial = try {
            AndroidTlsManager.ensureMaterial(context.applicationContext, defaultLocalNodeName(), network.addresses)
        } catch (exc: Exception) {
            null
        }
        _state.update {
            it.copy(
                running = true,
                localIp = network.preferredIp,
                localIps = network.addresses,
                localNetworkTransport = network.transport,
                localNetworkHint = network.reachabilityHint,
                startedAtMillis = System.currentTimeMillis(),
                nodeName = defaultLocalNodeName(),
                lastError = null,
                isCharging = detectCharging(),
                chargingSource = detectChargingSource(),
                isBatteryOptimizationExempt = detectBatteryOptimizationExempt()
            )
        }
        scope.launch {
            AndroidTtsEngine.prewarm(context.applicationContext)
        }
        scope.launch {
            AndroidAsrEngine.prewarm(context.applicationContext)
        }
        if (_state.value.packs.any { it.id == "android-gemma-chat-local" && it.loaded }) {
            scope.launch {
                AndroidChatEngine.prewarm(context.applicationContext)
            }
        }
        AndroidServiceAdvertiser.start(context.applicationContext, defaultLocalNodeName(), PORT, VERSION)
        scope.launch {
            runServerLoop(setupPort = true)
        }
        scope.launch {
            runServerLoop(setupPort = false)
        }
    }

    fun stop() {
        running.set(false)
        try {
            secureServerSocket?.close()
            setupServerSocket?.close()
        } catch (_: Exception) {
        }
        appContext?.let { AndroidServiceAdvertiser.stop(it) }
        AndroidTtsEngine.shutdown()
        AndroidChatEngine.shutdown()
        AndroidAsrEngine.shutdown()
        secureServerSocket = null
        setupServerSocket = null
        lastCpuSample = null
        _state.update { it.copy(running = false) }
    }

    fun handleNetworkChange(context: Context) {
        val snapshot = detectNetworkSnapshot()
        val current = _state.value
        val changed = snapshot.preferredIp != current.localIp ||
            snapshot.addresses != current.localIps ||
            snapshot.transport != current.localNetworkTransport

        if (!running.get()) {
            _state.update {
                it.copy(
                    localIp = snapshot.preferredIp,
                    localIps = snapshot.addresses,
                    localNetworkTransport = snapshot.transport,
                    localNetworkHint = snapshot.reachabilityHint
                )
            }
            return
        }

        if (!changed || !restartingForNetworkChange.compareAndSet(false, true)) return

        scope.launch {
            try {
                stop()
                delay(350)
                start(context.applicationContext)
            } finally {
                restartingForNetworkChange.set(false)
            }
        }
    }

    fun loadPack(packId: String): LocalPack? {
        var loadedPack: LocalPack? = null
        _state.update { current ->
            val updated = current.packs.map { pack ->
                when {
                    pack.id != packId -> pack
                    !pack.loadable || pack.loaded -> pack
                    else -> pack.copy(loaded = true).also { loadedPack = it }
                }
            }
            current.copy(packs = updated)
        }
        if (loadedPack != null) {
            persistLoadedPacks()
            if (loadedPack?.id == "android-gemma-chat-local") {
                appContext?.let { context ->
                    scope.launch {
                        AndroidChatEngine.prewarm(context)
                    }
                }
            }
        }
        return loadedPack
    }

    fun unloadPack(packId: String): LocalPack? {
        var unloadedPack: LocalPack? = null
        _state.update { current ->
            val updated = current.packs.map { pack ->
                when {
                    pack.id != packId -> pack
                    !pack.loadable || !pack.loaded -> pack
                    else -> pack.copy(loaded = false).also { unloadedPack = it }
                }
            }
            current.copy(packs = updated)
        }
        if (unloadedPack != null) {
            persistLoadedPacks()
            if (unloadedPack?.id == "android-gemma-chat-local") {
                AndroidChatEngine.shutdown()
            }
        }
        return unloadedPack
    }

    private fun restorePersistedState() {
        val prefs = appContext?.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE) ?: return
        val loadedIds = prefs.getStringSet(KEY_LOADED_PACKS, null) ?: return
        _state.update { current ->
            current.copy(
                packs = current.packs.map { pack ->
                    if (pack.loadable) {
                        pack.copy(loaded = pack.id in loadedIds)
                    } else {
                        pack
                    }
                }
            )
        }
    }

    private fun persistLoadedPacks() {
        val prefs = appContext?.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE) ?: return
        val loadedIds = _state.value.packs
            .filter { it.loadable && it.loaded }
            .map { it.id }
            .toSet()
        prefs.edit().putStringSet(KEY_LOADED_PACKS, loadedIds).apply()
    }

    private fun runServerLoop(setupPort: Boolean) {
        val port = if (setupPort) SETUP_PORT else PORT
        try {
            val server = if (setupPort) {
                ServerSocket(port)
            } else {
                val sslContext = tlsMaterial?.sslContext
                    ?: throw IllegalStateException("Android TLS material is not available")
                (sslContext.serverSocketFactory.createServerSocket(port) as SSLServerSocket).apply {
                    useClientMode = false
                    enabledProtocols = enabledProtocols.filter { it == "TLSv1.3" || it == "TLSv1.2" }.toTypedArray()
                }
            }

            if (setupPort) {
                setupServerSocket = server
            } else {
                secureServerSocket = server
            }

            while (running.get()) {
                val socket = server.accept()
                scope.launch { handle(socket, setupPort) }
            }
        } catch (exc: Exception) {
            _state.update { current ->
                current.copy(
                    lastError = exc.message ?: exc.javaClass.simpleName,
                    running = running.get()
                )
            }
        } finally {
            if (setupPort) {
                setupServerSocket?.close()
                setupServerSocket = null
            } else {
                secureServerSocket?.close()
                secureServerSocket = null
            }
            if (!running.get()) {
                _state.update { it.copy(running = false, isCharging = null, chargingSource = null, isBatteryOptimizationExempt = null) }
            }
        }
    }

    private suspend fun handle(socket: Socket, setupPort: Boolean) {
        try {
            socket.use { client ->
                val input = BufferedReader(InputStreamReader(client.getInputStream(), StandardCharsets.UTF_8))
                val requestLine = input.readLine() ?: return
                if (requestLine.isBlank()) return
                val parts = requestLine.split(" ")
                val method = parts.getOrElse(0) { "GET" }
                val rawPath = parts.getOrElse(1) { "/" }
                val (path, query) = splitPathAndQuery(rawPath)

                val headers = mutableMapOf<String, String>()
                var contentLength = 0
                while (true) {
                    val line = input.readLine() ?: break
                    if (line.isBlank()) break
                    val idx = line.indexOf(':')
                    if (idx > 0) {
                        val key = line.substring(0, idx).trim().lowercase()
                        val value = line.substring(idx + 1).trim()
                        headers[key] = value
                        if (key == "content-length") {
                            contentLength = value.toIntOrNull() ?: 0
                        }
                    }
                }

                val body = readRequestBody(input, contentLength)
                val contentType = headers["content-type"].orEmpty().lowercase()

                _state.update { it.copy(sessionCount = it.sessionCount + 1) }
                recordRemoteClient(
                    address = client.inetAddress?.hostAddress.orEmpty(),
                    path = path,
                    userAgent = headers["user-agent"]
                )
                val response = when {
                    method == "OPTIONS" -> emptyResponse(204)
                    method == "GET" && path == "/" && setupPort -> htmlResponse(setupHtml())
                    method == "GET" && path == "/setup" -> htmlResponse(setupHtml())
                    method == "GET" && path == "/setup/ca.crt" -> pemResponse(tlsMaterial?.caPem ?: "")
                    method == "GET" && path == "/health" -> jsonResponse(healthJson())
                    method == "GET" && path == "/discover" -> jsonResponse(discoverJson())
                    method == "GET" && path == "/capabilities" -> jsonResponse(capabilitiesJson())
                    method == "GET" && path == "/cluster/nodes" -> jsonResponse(clusterJson())
                    method == "GET" && path == "/system/stats" -> jsonResponse(systemStatsJson())
                    method == "GET" && path == "/setup/trust-status" -> jsonResponse(trustStatusJson())
                    method == "GET" && path == "/v1/models" -> jsonResponse(modelsCatalogJson())
                    method == "GET" && path == "/v1/mobile/model-packs" -> jsonResponse(modelPacksJson())
                    method == "GET" && path == "/v1/voices" -> jsonResponse(ttsVoicesJson())
                    method == "POST" && path == "/v1/mobile/model-packs/load" -> {
                        val payload = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        jsonResponse(loadPackJson(payload))
                    }
                    method == "POST" && path == "/v1/mobile/model-packs/unload" -> {
                        val payload = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        jsonResponse(unloadPackJson(payload))
                    }
                    method == "POST" && path == "/v1/pronunco/compare-pinyin" -> {
                        val payload = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        jsonResponse(comparePinyinJson(payload))
                    }
                    method == "GET" && path == "/v1/pronunco/compare-pinyin" -> {
                        val expected = query["expected"].orEmpty()
                        val actual = query["actual"].orEmpty()
                        jsonResponse(comparePinyinJson(JSONObject().put("expected", expected).put("actual", actual)))
                    }
                    method == "POST" && path == "/v1/translate-small/preview" -> {
                        val payload = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        jsonResponse(translatePreviewJson(payload))
                    }
                    method == "POST" && path == "/v1/chat" -> {
                        val payload = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        chatResponse(payload)
                    }
                    method == "GET" && path == "/v1/translate-small/preview" -> {
                        val text = query["text"].orEmpty()
                        jsonResponse(translatePreviewJson(JSONObject().put("text", text)))
                    }
                    method == "POST" && path == "/v1/synthesize-speech" -> {
                        val payload = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        synthesizeSpeechResponse(payload)
                    }
                    method == "POST" && path == "/v1/transcribe-audio" -> {
                        if (!contentType.startsWith("application/json")) {
                            errorJsonResponse(
                                415,
                                "Android ASR expects application/json uploads with audioBase64 and mimeType.",
                                code = "json_base64_required"
                            )
                        } else {
                            val payload = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                            transcribeAudioResponse(payload)
                        }
                    }
                    method == "GET" && !setupPort -> commandCenterRouteResponse(path)
                    else -> textResponse(404, "Not found")
                }

                writeResponse(client.getOutputStream(), response)
            }
        } catch (exc: Exception) {
            _state.update { current ->
                current.copy(lastError = exc.message ?: exc.javaClass.simpleName)
            }
        }
    }

    private fun comparePinyinJson(payload: JSONObject): JSONObject {
        _state.update { it.copy(pronuncoRequests = it.pronuncoRequests + 1) }
        val expected = payload.optString("expected")
        val actual = payload.optString("actual")
        val result = PronuncoPinyinTools.compare(expected, actual)
        return JSONObject()
            .put("product", PRODUCT)
            .put("tool", "pronunco-pinyin-tools")
            .put("expectedNormalized", result.expectedNormalized)
            .put("actualNormalized", result.actualNormalized)
            .put("expectedSyllables", JSONArray(result.expectedSyllables))
            .put("actualSyllables", JSONArray(result.actualSyllables))
            .put("toneMismatches", result.toneMismatches)
            .put("syllableDistance", result.syllableDistance)
            .put("similarity", result.similarity)
    }

    private fun loadPackJson(payload: JSONObject): JSONObject {
        val packId = payload.optString("id")
        if (packId.isBlank()) {
            return JSONObject().put("ok", false).put("error", "pack id is required")
        }
        val loadedPack = loadPack(packId)
        return if (loadedPack != null) {
            JSONObject()
                .put("ok", true)
                .put("pack", packJson(loadedPack))
                .put("packs", JSONArray(_state.value.packs.map { packJson(it) }))
        } else {
            JSONObject().put("ok", false).put("error", "pack not loadable or not found")
        }
    }

    private fun unloadPackJson(payload: JSONObject): JSONObject {
        val packId = payload.optString("id")
        if (packId.isBlank()) {
            return JSONObject().put("ok", false).put("error", "pack id is required")
        }
        val unloadedPack = unloadPack(packId)
        return if (unloadedPack != null) {
            JSONObject()
                .put("ok", true)
                .put("pack", packJson(unloadedPack))
                .put("packs", JSONArray(_state.value.packs.map { packJson(it) }))
        } else {
            JSONObject().put("ok", false).put("error", "pack not unloadable or not found")
        }
    }

    private fun translatePreviewJson(payload: JSONObject): JSONObject {
        val text = payload.optString("text")
        val translatePack = _state.value.packs.firstOrNull { it.id == "translate-small-preview" }
        if (translatePack?.loaded != true) {
            return JSONObject()
                .put("ok", false)
                .put("available", false)
                .put("error", "translate-small-preview is not loaded")
        }
        val result = TranslateSmallPreview.translate(text)
        return JSONObject()
            .put("ok", result.available)
            .put("available", result.available)
            .put("input", text)
            .put("normalized", result.normalized)
            .put("translation", result.translation)
            .put("matchedBy", result.matchedBy)
            .put("note", result.note)
    }

    private suspend fun chatResponse(payload: JSONObject): HttpResponse {
        val context = appContext ?: return errorJsonResponse(503, "Android app context is not available.")
        val messages = payload.optJSONArray("messages")
            ?: return errorJsonResponse(400, "messages array is required")
        val language = payload.optString("language").trim().ifBlank { null }
        val modelOverride = payload.optString("model").trim().ifBlank { null }
        val startedAt = SystemClock.elapsedRealtime()

        return try {
            val result = AndroidChatEngine.generate(
                context = context,
                messages = messages,
                languageHint = language,
                modelOverride = modelOverride
            )
            _state.update { current ->
                current.copy(
                    chatRequests = current.chatRequests + 1,
                    lastChatDurationMs = (SystemClock.elapsedRealtime() - startedAt).coerceAtLeast(0L),
                    lastChatPromptChars = result.promptChars,
                    lastChatResponseChars = result.responseChars,
                    lastChatBackend = result.backend,
                    lastChatModelId = result.modelId,
                    lastChatLanguageTag = result.languageTag,
                    lastChatAtMillis = System.currentTimeMillis()
                )
            }
            jsonResponse(
                JSONObject()
                    .put("response", result.content)
                    .put("role", "assistant")
                    .put("content", result.content)
                    .put("model", result.modelId)
                    .put("backend", result.backend)
                    .put("language", result.languageTag ?: JSONObject.NULL)
            )
        } catch (exc: IllegalArgumentException) {
            errorJsonResponse(400, exc.message ?: "Invalid chat request")
        } catch (exc: IllegalStateException) {
            errorJsonResponse(503, exc.message ?: "Android chat is not available on this node")
        } catch (exc: Exception) {
            errorJsonResponse(502, "Local chat failed: ${exc.message ?: exc.javaClass.simpleName}")
        }
    }

    private suspend fun ttsVoicesJson(): JSONObject {
        val context = appContext ?: return JSONObject()
            .put("available", false)
            .put("voices", JSONArray())
            .put("error", "Android app context is not available.")
        val voices = AndroidTtsEngine.listVoices(context)
        return JSONObject()
            .put("available", voices.isNotEmpty())
            .put("voices", JSONArray(voices.map { voice ->
                JSONObject()
                    .put("name", voice.name)
                    .put("languageTag", voice.languageTag)
                    .put("quality", voice.quality)
                    .put("latency", voice.latency)
            }))
    }

    private suspend fun synthesizeSpeechResponse(payload: JSONObject): HttpResponse {
        val context = appContext ?: return errorJsonResponse(503, "Android app context is not available.")
        val text = payload.optString("text").trim()
        if (text.isBlank()) {
            return errorJsonResponse(400, "text is required")
        }
        val targetLang = payload.optString("targetLang", "en-US")
        val voice = payload.optString("voice").takeIf { it.isNotBlank() }
        val speed = payload.optDouble("speed", 1.0).toFloat()
        val startedAt = SystemClock.elapsedRealtime()

        return try {
            val result = AndroidTtsEngine.synthesize(
                context = context,
                text = text,
                targetLang = targetLang,
                voiceName = voice,
                speed = speed
            )
            _state.update { current ->
                current.copy(
                    ttsRequests = current.ttsRequests + 1,
                    lastTtsDurationMs = (SystemClock.elapsedRealtime() - startedAt).coerceAtLeast(0L),
                    lastTtsAudioBytes = result.wavBytes.size,
                    lastTtsVoice = result.voice,
                    lastTtsLanguageTag = result.languageTag,
                    lastTtsAtMillis = System.currentTimeMillis()
                )
            }
            binaryResponse(200, "audio/wav", result.wavBytes)
        } catch (exc: IllegalArgumentException) {
            errorJsonResponse(400, exc.message ?: "Invalid synthesize-speech request")
        } catch (exc: IllegalStateException) {
            errorJsonResponse(503, exc.message ?: "Android TTS is not available on this node")
        } catch (exc: Exception) {
            errorJsonResponse(502, "Speech synthesis failed: ${exc.message ?: exc.javaClass.simpleName}")
        }
    }

    private suspend fun transcribeAudioResponse(payload: JSONObject): HttpResponse {
        val context = appContext ?: return errorJsonResponse(503, "Android app context is not available.")
        val audioBase64 = payload.optString("audioBase64").trim()
        if (audioBase64.isBlank()) {
            return errorJsonResponse(400, "audioBase64 is required")
        }
        val mimeType = payload.optString("mimeType", "audio/webm").trim().ifBlank { "audio/webm" }
        val language = payload.optString("language").trim().ifBlank { null }
        val backend = payload.optString("backend").trim().ifBlank { null }
        val audioBytes = try {
            Base64.decode(audioBase64, Base64.DEFAULT)
        } catch (exc: IllegalArgumentException) {
            return errorJsonResponse(400, "audioBase64 is not valid base64")
        }
        if (audioBytes.isEmpty()) {
            return errorJsonResponse(400, "decoded audio payload is empty")
        }
        val startedAt = SystemClock.elapsedRealtime()

        return try {
            val result = AndroidAsrEngine.transcribe(
                context = context,
                audioBytes = audioBytes,
                mimeType = mimeType,
                languageHint = language,
                backendHint = backend
            )
            _state.update { current ->
                current.copy(
                    asrRequests = current.asrRequests + 1,
                    lastAsrDurationMs = (SystemClock.elapsedRealtime() - startedAt).coerceAtLeast(0L),
                    lastAsrAudioBytes = result.audioBytes,
                    lastAsrBackend = result.backend,
                    lastAsrLanguageTag = result.languageTag,
                    lastAsrAtMillis = System.currentTimeMillis()
                )
            }
            jsonResponse(
                JSONObject()
                    .put("text", result.text)
                    .put("language", result.languageTag ?: JSONObject.NULL)
                    .put("backend", result.backend)
                    .put("backend_id", result.backendId)
                    .put("model", result.backend)
                    .put("audio_bytes", result.audioBytes)
            )
        } catch (exc: IllegalArgumentException) {
            errorJsonResponse(400, exc.message ?: "Invalid transcribe-audio request")
        } catch (exc: IllegalStateException) {
            errorJsonResponse(503, exc.message ?: "Android ASR is not available on this node")
        } catch (exc: Exception) {
            errorJsonResponse(502, "Speech transcription failed: ${exc.message ?: exc.javaClass.simpleName}")
        }
    }

    private fun clusterJson(): JSONObject {
        val state = _state.value
        val gatewayUrl = runtimeLanUrl(state)
        val managedNode = JSONObject()
            .put("state", if (state.running) "managed" else "stopped")
            .put("runtimeKind", "android_service")

        val node = JSONObject()
            .put("hostname", state.nodeName)
            .put("ip", state.localIp ?: "127.0.0.1")
            .put("os", "android")
            .put("arch", Build.SUPPORTED_ABIS.firstOrNull().orEmpty())
            .put("suggested_roles", JSONArray(listOf("travel-node", "light-specialist", "pronunco-helper")))
            .put("strengths", JSONArray(listOf("portable control plane", "PronunCo helper tools", "offline local runtime")))
            .put("models", JSONArray(state.packs.filter { it.loaded }.map { it.name }))
            .put("capabilities", JSONArray(capabilityStatuses(state).filter { it.available }.map { it.profile.name }))
            .put("quality_profiles", JSONArray(nodeQualityProfiles()))
            .put("network_transport", state.localNetworkTransport ?: JSONObject.NULL)
            .put("network_ips", JSONArray(state.localIps))
            .put("network_hint", state.localNetworkHint ?: JSONObject.NULL)
            .put("managedNode", managedNode)
            .put("offline", !state.running)

        return JSONObject()
            .put(
                "gateway",
                JSONObject()
                    .put("hostname", state.nodeName)
                    .put("url", gatewayUrl)
            )
            .put("nodes", JSONArray().put(node))
    }

    private fun systemStatsJson(): JSONObject {
        val state = _state.value
        val uptimeSeconds = state.startedAtMillis?.let {
            ((System.currentTimeMillis() - it) / 1000L).coerceAtLeast(0L)
        } ?: 0L
        val totalRamBytes = detectTotalRamBytes()
        val appMemoryPssBytes = detectAppMemoryPssBytes()
        val storageStats = detectStorageStats()
        val batteryPercent = detectBatteryPercent()
        val batteryTempC = detectBatteryTemperatureC()
        val thermalStatus = detectThermalStatus()
        val processCpuPercent = detectProcessCpuPercent()

        val connectedApps = JSONArray()
            .put(
                JSONObject()
                    .put("name", "iHN Home shell")
                    .put("active_sessions", if (state.running) 1 else 0)
                    .put("last_seen", "now")
            )

        if (state.pronuncoRequests > 0) {
            connectedApps.put(
                JSONObject()
                    .put("name", "PronunCo helper traffic")
                    .put("active_sessions", state.pronuncoRequests)
                    .put("last_seen", "now")
            )
        }

        if (state.remoteClients.isNotEmpty()) {
            connectedApps.put(
                JSONObject()
                    .put("name", "Remote client traffic")
                    .put("active_sessions", state.remoteClients.sumOf { it.requestCount })
                    .put("last_seen", "now")
            )
        }

        if (state.chatRequests > 0) {
            connectedApps.put(
                JSONObject()
                    .put("name", "Android local chat traffic")
                    .put("active_sessions", state.chatRequests)
                    .put("last_seen", state.lastChatAtMillis?.let(::relativeAgeLabel) ?: "now")
            )
        }

        if (state.ttsRequests > 0) {
            connectedApps.put(
                JSONObject()
                    .put("name", "Android TTS traffic")
                    .put("active_sessions", state.ttsRequests)
                    .put("last_seen", state.lastTtsAtMillis?.let(::relativeAgeLabel) ?: "now")
            )
        }

        if (state.asrRequests > 0) {
            connectedApps.put(
                JSONObject()
                    .put("name", "Android ASR traffic")
                    .put("active_sessions", state.asrRequests)
                    .put("last_seen", state.lastAsrAtMillis?.let(::relativeAgeLabel) ?: "now")
            )
        }

        val connectedClients = JSONArray()
        state.remoteClients.forEach { client ->
            connectedClients.put(
                JSONObject()
                    .put("ip", client.address)
                    .put("label", client.label)
                    .put("request_count", client.requestCount)
                    .put("last_seen", relativeAgeLabel(client.lastSeenMillis))
                    .put("last_path", client.lastPath ?: JSONObject.NULL)
                    .put("user_agent", client.userAgent ?: JSONObject.NULL)
            )
        }

        return JSONObject()
            .put("uptime_seconds", uptimeSeconds)
            .put("session_count", state.sessionCount)
            .put("battery_percent", batteryPercent ?: JSONObject.NULL)
            .put("battery_temp_c", batteryTempC ?: JSONObject.NULL)
            .put("free_storage_bytes", storageStats?.first ?: JSONObject.NULL)
            .put("total_storage_bytes", storageStats?.second ?: JSONObject.NULL)
            .put("total_ram_bytes", totalRamBytes ?: JSONObject.NULL)
            .put("app_memory_pss_bytes", appMemoryPssBytes ?: JSONObject.NULL)
            .put("process_cpu_percent", processCpuPercent ?: JSONObject.NULL)
            .put("thermal_status", thermalStatus ?: JSONObject.NULL)
            .put("remote_client_count", state.remoteClients.size)
            .put(
                "performance",
                JSONObject()
                    .put("cpu_cores", Runtime.getRuntime().availableProcessors())
                    .put("app_cpu_percent", processCpuPercent ?: JSONObject.NULL)
                    .put("app_memory_pss_bytes", appMemoryPssBytes ?: JSONObject.NULL)
                    .put("battery_temp_c", batteryTempC ?: JSONObject.NULL)
                    .put("thermal_status", thermalStatus ?: JSONObject.NULL)
                    .put(
                        "chat",
                        JSONObject()
                            .put("request_count", state.chatRequests)
                            .put("last_duration_ms", state.lastChatDurationMs ?: JSONObject.NULL)
                            .put("last_prompt_chars", state.lastChatPromptChars ?: JSONObject.NULL)
                            .put("last_response_chars", state.lastChatResponseChars ?: JSONObject.NULL)
                            .put("last_backend", state.lastChatBackend ?: JSONObject.NULL)
                            .put("last_model_id", state.lastChatModelId ?: JSONObject.NULL)
                            .put("last_language_tag", state.lastChatLanguageTag ?: JSONObject.NULL)
                            .put("last_seen", state.lastChatAtMillis?.let(::relativeAgeLabel) ?: JSONObject.NULL)
                    )
                    .put(
                        "asr",
                        JSONObject()
                            .put("request_count", state.asrRequests)
                            .put("last_duration_ms", state.lastAsrDurationMs ?: JSONObject.NULL)
                            .put("last_audio_bytes", state.lastAsrAudioBytes ?: JSONObject.NULL)
                            .put("last_backend", state.lastAsrBackend ?: JSONObject.NULL)
                            .put("last_language_tag", state.lastAsrLanguageTag ?: JSONObject.NULL)
                            .put("last_seen", state.lastAsrAtMillis?.let(::relativeAgeLabel) ?: JSONObject.NULL)
                    )
                    .put(
                        "tts",
                        JSONObject()
                            .put("request_count", state.ttsRequests)
                            .put("last_duration_ms", state.lastTtsDurationMs ?: JSONObject.NULL)
                            .put("last_audio_bytes", state.lastTtsAudioBytes ?: JSONObject.NULL)
                            .put("last_voice", state.lastTtsVoice ?: JSONObject.NULL)
                            .put("last_language_tag", state.lastTtsLanguageTag ?: JSONObject.NULL)
                            .put("last_seen", state.lastTtsAtMillis?.let(::relativeAgeLabel) ?: JSONObject.NULL)
                    )
            )
            .put(
                "network",
                JSONObject()
                    .put("transport", state.localNetworkTransport ?: JSONObject.NULL)
                    .put("preferred_ip", state.localIp ?: JSONObject.NULL)
                    .put("ips", JSONArray(state.localIps))
                    .put("hint", state.localNetworkHint ?: JSONObject.NULL)
            )
            .put("server_readiness", serverReadinessJson(state, batteryPercent, batteryTempC, thermalStatus, processCpuPercent, totalRamBytes, appMemoryPssBytes))
            .put("connected_clients", connectedClients)
            .put("connected_apps", connectedApps)
    }

    private fun trustStatusJson(): JSONObject {
        val state = _state.value
        val context = appContext ?: return JSONObject()
            .put("status", "missing_ca")
            .put("message", "Android app context is not available yet.")
            .put("lanIp", state.localIp ?: "")
            .put("lanIps", JSONArray(state.localIps))
            .put("hostnames", JSONArray())
            .put("homeCa", JSONObject().put("present", false))
            .put("serverCert", JSONObject().put("present", false))
        return AndroidTlsManager.trustStatusJson(context, state.nodeName, state.localIp, state.localIps)
    }

    private fun healthJson(): JSONObject {
        val state = _state.value
        val models = JSONObject()
        capabilityStatuses(state)
            .filter { it.available }
            .forEach { status -> models.put(status.profile.name, status.packId) }
        val batteryPercent = detectBatteryPercent()
        val batteryTempC = detectBatteryTemperatureC()
        val thermalStatus = detectThermalStatus()
        val processCpuPercent = detectProcessCpuPercent()
        val totalRamBytes = detectTotalRamBytes()
        val appMemoryPssBytes = detectAppMemoryPssBytes()
        return JSONObject()
            .put("ok", state.running)
            .put("status", if (state.running) "ok" else "stopped")
            .put("product", PRODUCT)
            .put("version", VERSION)
            .put("hostname", state.nodeName)
            .put("ollama", false)
            .put("providers", JSONArray(listOf("android_local")))
            .put("models", models)
            .put("available_capabilities", JSONArray(capabilityStatuses(state).filter { it.available }.map { it.profile.name }))
            .put("binding", "0.0.0.0")
            .put("network_transport", state.localNetworkTransport ?: JSONObject.NULL)
            .put("network_ips", JSONArray(state.localIps))
            .put("port", state.port)
            .put("server_readiness", serverReadinessJson(state, batteryPercent, batteryTempC, thermalStatus, processCpuPercent, totalRamBytes, appMemoryPssBytes))
    }

    private fun discoverJson(): JSONObject {
        val state = _state.value
        return JSONObject()
            .put("product", PRODUCT)
            .put("version", VERSION)
            .put("role", "brain")
            .put("hostname", state.nodeName)
            .put("ip", state.localIp ?: "127.0.0.1")
            .put("port", state.port)
            .put("protocol", "https")
            .put("os", "android")
            .put("arch", Build.SUPPORTED_ABIS.firstOrNull().orEmpty())
            .put("gpu", JSONObject.NULL)
            .put("ram_bytes", detectTotalRamBytes() ?: JSONObject.NULL)
            .put("suggested_roles", JSONArray(listOf("travel-node", "light-specialist", "pronunco-helper")))
            .put("strengths", JSONArray(listOf("portable control plane", "PronunCo helper tools", "offline local runtime")))
            .put("accelerators", JSONArray())
            .put("ollama", false)
            .put("capabilities", JSONArray(capabilityStatuses(state).filter { it.available }.map { it.profile.name }))
            .put("quality_profiles", JSONArray(nodeQualityProfiles()))
            .put("network_transport", state.localNetworkTransport ?: JSONObject.NULL)
            .put("network_hint", state.localNetworkHint ?: JSONObject.NULL)
            .put("network_ips", JSONArray(state.localIps))
            .put("models", JSONArray(state.packs.filter { it.loaded }.map { it.name }))
    }

    private fun capabilitiesJson(): JSONObject {
        val state = _state.value
        val statusByCapability = capabilityStatuses(state).associateBy { it.profile.name }
        val flatCapabilities = JSONObject()
        val detailCapabilities = JSONObject()
        statusByCapability.forEach { (capability, status) ->
            flatCapabilities.put(capability, status.available)
            detailCapabilities.put(capability, capabilityStatusJson(status))
        }
        return JSONObject()
            .put("product", PRODUCT)
            .put("version", VERSION)
            .put("capabilities", flatCapabilities)
            .put("_detail", JSONObject()
                .put("product", PRODUCT)
                .put("version", VERSION)
                .put("node_profile", nodeProfileJson(state))
                .put("capabilities", detailCapabilities))
            .apply {
                statusByCapability.forEach { (capability, status) ->
                    put(capability, status.available)
                }
            }
    }

    private fun modelsCatalogJson(): JSONObject {
        val state = _state.value
        val statuses = capabilityStatuses(state)
        val modelsArray = JSONArray()

        state.packs.forEach { pack ->
            val packStatuses = statuses.filter { it.packId == pack.id }
            val isExperimental = pack.note.contains("experimental", ignoreCase = true) ||
                pack.note.contains("preview", ignoreCase = true)

            packStatuses.forEach { status ->
                val modelEntry = JSONObject()
                    .put("id", "${pack.id}:${status.profile.name}")
                    .put("object", "model")
                    .put("created", state.startedAtMillis ?: 0)
                    .put("owned_by", "ihomenerd-android")
                    .put("pack_id", pack.id)
                    .put("pack_name", pack.name)
                    .put("pack_kind", pack.kind)
                    .put("capability", status.profile.name)
                    .put("capability_title", status.profile.title)
                    .put("backend", status.profile.backend)
                    .put("implementation", status.profile.implementation)
                    .put("tier", status.profile.tier)
                    .put("load_state", status.loadState)
                    .put("loaded", status.available)
                    .put("loadable", status.loadable)
                    .put("experimental", isExperimental)
                    .put("offline", status.profile.offline)
                    .put("streaming", status.profile.streaming)
                    .put("languages", JSONArray(status.profile.languages))
                    .put("latency_class", status.profile.latencyClass)
                    .put("quality_modes", JSONArray(status.profile.modes.map { modeJson(it, status.available) }))
                    .put("note", listOf(status.profile.note, status.packNote).filter { it.isNotBlank() }.distinct().joinToString(" "))

                if (status.profile.name == "chat") {
                    appContext?.let { ctx ->
                        modelEntry.put("model_file", AndroidChatEngine.availableModelSummary(ctx) ?: JSONObject.NULL)
                        AndroidChatEngine.activeBackendName()?.let { backendName ->
                            modelEntry.put("active_backend", backendName)
                        }
                    }
                }

                if (status.profile.name == "transcribe_audio") {
                    appContext?.let { ctx ->
                        val backends = AndroidAsrEngine.availableBackendChoices(ctx)
                        modelEntry.put("backend_choices", JSONArray(backends.map { b ->
                            JSONObject()
                                .put("id", b.id)
                                .put("title", b.title)
                                .put("backend", b.backend)
                                .put("languages", JSONArray(b.languages))
                        }))
                    }
                }

                modelsArray.put(modelEntry)
            }
        }

        val loadedCount = state.packs.count { it.loaded }
        val loadableCount = state.packs.count { !it.loaded && it.loadable }
        val experimentalCount = state.packs.count { pack ->
            pack.note.contains("experimental", ignoreCase = true) || pack.note.contains("preview", ignoreCase = true)
        }

        return JSONObject()
            .put("product", PRODUCT)
            .put("version", VERSION)
            .put("node", state.nodeName)
            .put("os", "android")
            .put("runtime_running", state.running)
            .put("total_packs", state.packs.size)
            .put("loaded_packs", loadedCount)
            .put("loadable_packs", loadableCount)
            .put("experimental_packs", experimentalCount)
            .put("data", modelsArray)
            .put(
                "summary",
                JSONObject()
                    .put("loaded", JSONArray(state.packs.filter { it.loaded }.map { it.name }))
                    .put("loadable", JSONArray(state.packs.filter { !it.loaded && it.loadable }.map { it.name }))
                    .put("unavailable", JSONArray(state.packs.filter { !it.loaded && !it.loadable }.map { it.name }))
                    .put("experimental", JSONArray(state.packs.filter { pack ->
                        pack.note.contains("experimental", ignoreCase = true) || pack.note.contains("preview", ignoreCase = true)
                    }.map { it.name }))
                    .put(
                        "capability_map",
                        JSONObject().apply {
                            statuses.filter { it.available }.forEach { status ->
                                put(status.profile.name, status.profile.backend)
                            }
                        }
                    )
            )
    }

    private fun modelPacksJson(): JSONObject {
        val array = JSONArray()
        _state.value.packs.forEach { pack ->
            array.put(packJson(pack))
        }
        return JSONObject()
            .put("product", PRODUCT)
            .put("version", VERSION)
            .put("packs", array)
    }

    private fun commandCenterRouteResponse(path: String): HttpResponse {
        if (path == "/" || path == "/app" || path == "/app/") {
            return commandCenterIndexResponse()
        }

        serveBundledCommandCenterAsset(path)?.let { return it }

        return if (shouldServeCommandCenterSpa(path)) {
            val bundledIndex = serveBundledCommandCenterAsset("/index.html")
            if (bundledIndex != null) {
                commandCenterIndexResponse()
            } else {
                textResponse(503, "Command Center not available - web assets not bundled")
            }
        } else {
            textResponse(404, "Not found")
        }
    }

    private fun commandCenterIndexResponse(): HttpResponse {
        return serveBundledCommandCenterAsset("/index.html")
            ?: htmlResponse(degradedCommandCenterHtml())
    }

    private fun serveBundledCommandCenterAsset(path: String): HttpResponse? {
        val assetPath = path.removePrefix("/")
            .takeIf { it.isNotBlank() && !it.contains("..") }
            ?: return null
        val context = appContext ?: return null
        val bytes = runCatching {
            context.assets.open(assetPath).use { it.readBytes() }
        }.getOrNull() ?: return null
        return binaryResponse(200, contentTypeForAsset(assetPath), bytes)
    }

    private fun shouldServeCommandCenterSpa(path: String): Boolean {
        if (path.startsWith("/assets/")) return false
        if (path.substringAfterLast('/', "").contains('.')) return false
        val blockedPrefixes = listOf(
            "/setup",
            "/health",
            "/discover",
            "/capabilities",
            "/cluster",
            "/system",
            "/sessions",
            "/v1"
        )
        return blockedPrefixes.none { path == it || path.startsWith("$it/") }
    }

    private fun contentTypeForAsset(assetPath: String): String {
        return when {
            assetPath.endsWith(".html") -> "text/html; charset=utf-8"
            assetPath.endsWith(".js") -> "application/javascript; charset=utf-8"
            assetPath.endsWith(".css") -> "text/css; charset=utf-8"
            assetPath.endsWith(".json") || assetPath.endsWith(".map") -> "application/json; charset=utf-8"
            assetPath.endsWith(".svg") -> "image/svg+xml"
            assetPath.endsWith(".png") -> "image/png"
            assetPath.endsWith(".jpg") || assetPath.endsWith(".jpeg") -> "image/jpeg"
            assetPath.endsWith(".gif") -> "image/gif"
            assetPath.endsWith(".webp") -> "image/webp"
            assetPath.endsWith(".ico") -> "image/x-icon"
            assetPath.endsWith(".woff2") -> "font/woff2"
            assetPath.endsWith(".woff") -> "font/woff"
            assetPath.endsWith(".ttf") -> "font/ttf"
            else -> "application/octet-stream"
        }
    }

    private fun packJson(pack: LocalPack): JSONObject {
        val statusByCapability = capabilityStatuses(_state.value)
            .filter { it.packId == pack.id }
            .associateBy { it.profile.name }
        val loadState = when {
            statusByCapability.values.any { it.loadState == "runtime_unavailable" } -> "runtime_unavailable"
            statusByCapability.values.any { it.available } -> "loaded"
            pack.loadable -> "available_to_load"
            else -> "planned"
        }
        return JSONObject()
            .put("id", pack.id)
            .put("name", pack.name)
            .put("kind", pack.kind)
            .put("loaded", pack.loaded)
            .put("loadable", pack.loadable)
            .put("loadState", loadState)
            .put("capabilities", JSONArray(pack.capabilities))
            .put(
                "capabilityProfiles",
                JSONArray(pack.capabilityProfiles.map { profile ->
                    capabilityProfileJson(profile, statusByCapability[profile.name]?.available ?: pack.loaded)
                })
            )
            .put("note", pack.note)
    }

    private fun commandCenterHtml(): String {
        val state = _state.value
        val packs = state.packs.joinToString("") { pack ->
            val capabilitySummary = pack.capabilityProfiles.joinToString(", ") { profile ->
                "${profile.name} · ${profile.backend} · ${profile.latencyClass}"
            }
            "<li><strong>${escape(pack.name)}</strong> (${escape(pack.kind)}) — ${if (pack.loaded) "loaded" else "planned"}<br><span>${escape(pack.note)}</span><br><span class=\"muted\">${escape(capabilitySummary)}</span></li>"
        }
        val compareDemo = PronuncoPinyinTools.compare("ni3 hao3", "ni3 hao2")
        return """
            <!doctype html>
            <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>iHomeNerd Android Node</title>
              <style>
                body { font-family: system-ui, sans-serif; background:#101218; color:#eef1f8; margin:0; padding:24px; }
                .card { background:#1a1e27; border:1px solid #2b3040; border-radius:18px; padding:20px; margin-bottom:16px; }
                code { background:#262b35; padding:2px 6px; border-radius:6px; }
                h1,h2 { margin:0 0 12px 0; }
                ul { padding-left:20px; }
                .muted { color:#9aa3b5; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>iHomeNerd Android Node</h1>
                <p class="muted">Portable node host on https://${escape(state.localIp ?: "127.0.0.1")}:${state.port}</p>
                <p>Status: <strong>${if (state.running) "online" else "stopped"}</strong></p>
                <p class="muted">Bootstrap and CA download remain on http://${escape(state.localIp ?: "127.0.0.1")}:${SETUP_PORT}/setup</p>
              </div>
              <div class="card">
                <h2>Network status</h2>
                <p>Transport: <strong>${escape(state.localNetworkTransport ?: "unknown")}</strong></p>
                <p>Advertised IPv4s: <code>${escape(state.localIps.joinToString(", ").ifBlank { "none yet" })}</code></p>
                <p class="muted">${escape(state.localNetworkHint ?: "Join the same Wi-Fi or hotspot to test remote access.")}</p>
              </div>
              <div class="card">
                <h2>Loaded local packs</h2>
                <ul>$packs</ul>
              </div>
              <div class="card">
                <h2>Capability routing snapshot</h2>
                <p class="muted">This node currently advertises <code>${escape(nodeQualityProfiles().joinToString(", "))}</code> quality profiles.</p>
                <p class="muted">Ask <code>/capabilities</code> for detailed per-feature availability, backend, offline support, and latency hints.</p>
              </div>
              <div class="card">
                <h2>PronunCo helper demo</h2>
                <p><code>ni3 hao3</code> vs <code>ni3 hao2</code></p>
                <p>Tone mismatches: <strong>${compareDemo.toneMismatches}</strong> · Similarity: <strong>${"%.2f".format(compareDemo.similarity)}</strong></p>
                <p class="muted">JSON endpoint: <code>/v1/pronunco/compare-pinyin</code></p>
              </div>
            </body>
            </html>
        """.trimIndent()
    }

    private fun degradedCommandCenterHtml(): String {
        val state = _state.value
        return """
            <!doctype html>
            <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>Command Center Unavailable</title>
              <style>
                body { font-family: system-ui, sans-serif; background:#1a1a1a; color:#eef1f8; margin:0; padding:24px; text-align:center; }
                .card { background:#2a2a2a; border:1px solid #4a4a4a; border-radius:12px; padding:32px; margin:24px auto; max-width:400px; }
                h1 { color:#ff6b6b; }
                code { background:#3a3a3a; padding:4px 8px; border-radius:4px; }
                .hint { color:#9aa3b5; margin-top:16px; }
                .status { color:#51cf66; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>Command Center Unavailable</h1>
                <p>The bundled web interface is not available on this device.</p>
                <p class="status">Runtime: ${if (state.running) "running" else "stopped"}</p>
                <p class="hint">The Command Center app must be bundled with the APK at build time.</p>
              </div>
              <div class="card">
                <p>Use <code>/capabilities</code> or <code>/health</code> for JSON status.</p>
                <p class="hint">Setup and bootstrap remain at http://${state.localIp ?: "127.0.0.1"}:${SETUP_PORT}/setup</p>
              </div>
            </body>
            </html>
        """.trimIndent()
    }

    private fun setupHtml(): String {
        val state = _state.value
        val host = escape(state.localIp ?: "127.0.0.1")
        return """
            <!doctype html>
            <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>iHomeNerd Android Setup</title>
              <style>
                body { font-family: system-ui, sans-serif; background:#101218; color:#eef1f8; margin:0; padding:24px; }
                .card { background:#1a1e27; border:1px solid #2b3040; border-radius:18px; padding:20px; margin-bottom:16px; }
                a { color:#8eb6ff; }
                code { background:#262b35; padding:2px 6px; border-radius:6px; }
                h1,h2 { margin:0 0 12px 0; }
                .muted { color:#9aa3b5; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>iHomeNerd Android Setup</h1>
                <p class="muted">Install the Android Home CA first, then open the full Command Center over HTTPS.</p>
                <p><a href="/setup/ca.crt">Download Home CA certificate</a></p>
                <p class="muted">Current network: <strong>${escape(state.localNetworkTransport ?: "unknown")}</strong> · ${escape(state.localNetworkHint ?: "Nearby devices should use the same Wi-Fi or hotspot.")}</p>
              </div>
              <div class="card">
                <h2>Next step</h2>
                <p>After trusting the CA on your client, open <code>https://$host:${PORT}</code>.</p>
                <p class="muted">This HTTP setup channel stays available on <code>http://$host:${SETUP_PORT}</code> for bootstrap and trust health.</p>
                <p class="muted">Other IPv4s on this device: <code>${escape(state.localIps.joinToString(", ").ifBlank { "none yet" })}</code></p>
              </div>
            </body>
            </html>
        """.trimIndent()
    }

    private fun splitPathAndQuery(rawPath: String): Pair<String, Map<String, String>> {
        val parts = rawPath.split("?", limit = 2)
        val path = parts[0]
        val query = if (parts.size == 2) {
            parts[1].split("&")
                .filter { it.contains("=") }
                .associate {
                    val pair = it.split("=", limit = 2)
                    URLDecoder.decode(pair[0], StandardCharsets.UTF_8.name()) to
                        URLDecoder.decode(pair[1], StandardCharsets.UTF_8.name())
                }
        } else {
            emptyMap()
        }
        return path to query
    }

    private fun readRequestBody(input: BufferedReader, contentLength: Int): String {
        if (contentLength <= 0) return ""
        val chars = CharArray(contentLength)
        var offset = 0
        while (offset < contentLength) {
            val read = input.read(chars, offset, contentLength - offset)
            if (read <= 0) break
            offset += read
        }
        return String(chars, 0, offset)
    }

    private fun writeResponse(output: OutputStream, response: HttpResponse) {
        output.write("HTTP/1.1 ${response.status} \r\n".toByteArray())
        output.write("Content-Type: ${response.contentType}\r\n".toByteArray())
        output.write("Access-Control-Allow-Origin: *\r\n".toByteArray())
        output.write("Access-Control-Allow-Headers: Content-Type\r\n".toByteArray())
        output.write("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n".toByteArray())
        output.write("Content-Length: ${response.body.size}\r\n".toByteArray())
        output.write("Connection: close\r\n".toByteArray())
        output.write("\r\n".toByteArray())
        output.write(response.body)
        output.flush()
    }

    private fun jsonResponse(json: JSONObject): HttpResponse {
        return HttpResponse(200, "application/json; charset=utf-8", json.toString().toByteArray())
    }

    private fun htmlResponse(html: String): HttpResponse {
        return HttpResponse(200, "text/html; charset=utf-8", html.toByteArray())
    }

    private fun pemResponse(pem: String): HttpResponse {
        return HttpResponse(200, "application/x-x509-ca-cert; charset=utf-8", pem.toByteArray())
    }

    private fun binaryResponse(status: Int, contentType: String, body: ByteArray): HttpResponse {
        return HttpResponse(status, contentType, body)
    }

    private fun errorJsonResponse(status: Int, detail: String, code: String? = null): HttpResponse {
        val body = JSONObject()
            .put("detail", detail)
            .apply {
                if (!code.isNullOrBlank()) {
                    put("code", code)
                }
            }
            .toString()
            .toByteArray()
        return HttpResponse(status, "application/json; charset=utf-8", body)
    }

    private fun emptyResponse(status: Int): HttpResponse {
        return HttpResponse(status, "text/plain; charset=utf-8", ByteArray(0))
    }

    private fun textResponse(status: Int, text: String): HttpResponse {
        return HttpResponse(status, "text/plain; charset=utf-8", text.toByteArray())
    }

    private fun runtimeLanUrl(state: LocalRuntimeState): String {
        val host = state.localIp ?: "127.0.0.1"
        return "https://$host:${state.port}"
    }

    private fun capabilityStatuses(state: LocalRuntimeState): List<CapabilityStatus> {
        return state.packs.flatMap { pack ->
            pack.capabilityProfiles.map { profile ->
                val runtimeAvailable = when (profile.name) {
                    "chat" -> if (!pack.loaded) null else (appContext?.let { AndroidChatEngine.isReady(it) } ?: false)
                    "transcribe_audio" -> appContext?.let { AndroidAsrEngine.isReady(it) } ?: false
                    "synthesize_speech" -> AndroidTtsEngine.isReady()
                    else -> null
                }
                val available = runtimeAvailable ?: pack.loaded
                val loadState = when {
                    available -> "loaded"
                    runtimeAvailable != null -> "runtime_unavailable"
                    pack.loadable -> "available_to_load"
                    else -> "planned"
                }
                CapabilityStatus(
                    profile = profile,
                    packId = pack.id,
                    packName = pack.name,
                    packKind = pack.kind,
                    packNote = pack.note,
                    available = available,
                    loadable = pack.loadable,
                    loadState = loadState
                )
            }
        }.sortedBy { it.profile.name }
    }

    private fun capabilityStatusJson(status: CapabilityStatus): JSONObject {
        val profile = status.profile
        return JSONObject()
            .put("available", status.available)
            .put("title", profile.title)
            .put("implementation", profile.implementation)
            .put("backend", profile.backend)
            .put("tier", profile.tier)
            .put("latency_class", profile.latencyClass)
            .put("offline", profile.offline)
            .put("streaming", profile.streaming)
            .put("pack_id", status.packId)
            .put("pack_name", status.packName)
            .put("pack_kind", status.packKind)
            .put("load_state", status.loadState)
            .put("requires_pack_load", !status.available && status.loadable)
            .put("languages", JSONArray(profile.languages))
            .put("quality_modes", JSONArray(profile.modes.map { modeJson(it, status.available) }))
            .put("note", listOf(profile.note, status.packNote).filter { it.isNotBlank() }.distinct().joinToString(" "))
            .apply {
                if (profile.name == "transcribe_audio") {
                    put("upload_transport", "json-base64")
                    put("preferred_upload_mime_type", "audio/wav")
                    val asrBackends = appContext?.let { AndroidAsrEngine.availableBackendChoices(it) }.orEmpty()
                    put("default_backend", "auto")
                    put("supports_backend_selection", asrBackends.isNotEmpty())
                    put(
                        "backend_choices",
                        JSONArray(asrBackends.map { backend ->
                            JSONObject()
                                .put("id", backend.id)
                                .put("title", backend.title)
                                .put("backend", backend.backend)
                                .put("languages", JSONArray(backend.languages))
                                .put("default_language", backend.defaultLanguageTag)
                                .put("note", backend.note)
                        })
                    )
                    put("language_routing", "auto-by-requested-language-or-explicit-backend")
                }
                if (profile.name == "chat") {
                    put("model_hint", appContext?.let { AndroidChatEngine.availableModelSummary(it) } ?: JSONObject.NULL)
                    AndroidChatEngine.activeBackendName()?.let { put("backend", it) }
                }
            }
    }

    private fun capabilityProfileJson(profile: LocalCapabilityProfile, available: Boolean): JSONObject {
        return JSONObject()
            .put("name", profile.name)
            .put("title", profile.title)
            .put("implementation", profile.implementation)
            .put("backend", profile.backend)
            .put("tier", profile.tier)
            .put("latency_class", profile.latencyClass)
            .put("offline", profile.offline)
            .put("streaming", profile.streaming)
            .put("languages", JSONArray(profile.languages))
            .put("available", available)
            .put("quality_modes", JSONArray(profile.modes.map { modeJson(it, available) }))
            .put("note", profile.note)
    }

    private fun modeJson(mode: CapabilityMode, capabilityAvailable: Boolean): JSONObject {
        return JSONObject()
            .put("id", mode.id)
            .put("label", mode.label)
            .put("available", capabilityAvailable && mode.available)
            .put("note", mode.note)
    }

    private fun nodeProfileJson(state: LocalRuntimeState): JSONObject {
        return JSONObject()
            .put("runtime", "android_service")
            .put("portable", true)
            .put("os", "android")
            .put("arch", Build.SUPPORTED_ABIS.firstOrNull().orEmpty())
            .put("ram_bytes", detectTotalRamBytes() ?: JSONObject.NULL)
            .put("network_transport", state.localNetworkTransport ?: JSONObject.NULL)
            .put("network_ips", JSONArray(state.localIps))
            .put("network_hint", state.localNetworkHint ?: JSONObject.NULL)
            .put("quality_profiles", JSONArray(nodeQualityProfiles()))
            .put("suggested_roles", JSONArray(listOf("travel-node", "light-specialist", "pronunco-helper")))
            .put("hostname", state.nodeName)
    }

    private fun serverReadinessJson(
        state: LocalRuntimeState,
        batteryPercent: Int?,
        batteryTempC: Double?,
        thermalStatus: String?,
        processCpuPercent: Double?,
        totalRamBytes: Long?,
        appMemoryPssBytes: Long?
    ): JSONObject {
        val isCharging = detectCharging()
        val chargingSource = detectChargingSource()
        val isBatteryOptExempt = detectBatteryOptimizationExempt()
        val hasLanIp = !state.localIps.isNullOrEmpty()
        val networkOk = state.localNetworkTransport == "wifi" || state.localNetworkTransport == "ethernet" || state.localNetworkTransport == "hotspot"

        val notes = mutableListOf<String>()

        if (!state.running) {
            notes.add("Runtime is not running. Start it to serve on :17777 and :17778.")
        }

        val lowBatteryNotCharging = batteryPercent != null && isCharging != true && batteryPercent <= 25
        if (lowBatteryNotCharging) {
            notes.add("Battery is low (${batteryPercent}%) and device is not charging. Connect to power for reliable semi-headless serving.")
        }

        if (isBatteryOptExempt != true) {
            notes.add("Battery optimization is not exempted for this app. Android may restrict the runtime background service.")
        }

        if (thermalStatus != null && thermalStatus != "none") {
            notes.add("Thermal status is '$thermalStatus'. Performance may be affected.")
        }

        if (!hasLanIp) {
            notes.add("No LAN IPv4 detected. Connect to Wi-Fi or enable hotspot for network serving.")
        }

        if (state.localNetworkTransport == "cellular" && hasLanIp) {
            notes.add("Active network is cellular-only. Nearby LAN clients may not reach this node.")
        }

        if (state.localNetworkTransport == "vpn") {
            notes.add("A VPN is active. Nearby LAN access may not be reachable.")
        }

        val readinessLevel = when {
            !state.running -> "not_ready"
            !hasLanIp -> "not_ready"
            notes.isEmpty() -> "ready"
            else -> "degraded"
        }

        return JSONObject()
            .put("runtime_running", state.running)
            .put("ports_serving", if (state.running) JSONArray(listOf(PORT, SETUP_PORT)) else JSONArray())
            .put("is_charging", isCharging)
            .put("charging_source", chargingSource ?: JSONObject.NULL)
            .put("battery_percent", batteryPercent ?: JSONObject.NULL)
            .put("battery_temp_c", batteryTempC ?: JSONObject.NULL)
            .put("battery_optimization_exempt", isBatteryOptExempt)
            .put("thermal_status", thermalStatus ?: JSONObject.NULL)
            .put("app_memory_pss_bytes", appMemoryPssBytes ?: JSONObject.NULL)
            .put("process_cpu_percent", processCpuPercent ?: JSONObject.NULL)
            .put("total_ram_bytes", totalRamBytes ?: JSONObject.NULL)
            .put("network_transport", state.localNetworkTransport ?: JSONObject.NULL)
            .put("network_ready", hasLanIp)
            .put("readiness_level", readinessLevel)
            .put("readiness_notes", JSONArray(notes))
    }

    private fun nodeQualityProfiles(): List<String> {
        val ramBytes = detectTotalRamBytes() ?: return listOf("fast")
        val ramGiB = ramBytes.toDouble() / (1024.0 * 1024.0 * 1024.0)
        return when {
            ramGiB >= 10.0 -> listOf("fast", "balanced", "deep")
            ramGiB >= 6.0 -> listOf("fast", "balanced")
            else -> listOf("fast")
        }
    }

    private fun recordRemoteClient(address: String, path: String, userAgent: String?) {
        if (!isRemoteClientAddress(address)) return
        val now = System.currentTimeMillis()
        _state.update { current ->
            val existing = current.remoteClients.firstOrNull { it.address == address }
            val label = existing?.label ?: address
            val updated = (current.remoteClients.filterNot { it.address == address } + RemoteClient(
                address = address,
                label = label,
                requestCount = (existing?.requestCount ?: 0) + 1,
                lastSeenMillis = now,
                lastPath = path.takeIf { it.isNotBlank() },
                userAgent = userAgent?.takeIf { it.isNotBlank() }
            ))
                .sortedByDescending { it.lastSeenMillis }
                .take(8)
            current.copy(remoteClients = updated)
        }
    }

    private fun isRemoteClientAddress(address: String): Boolean {
        if (address.isBlank()) return false
        return runCatching {
            val inet = InetAddress.getByName(address)
            !inet.isLoopbackAddress && !inet.isAnyLocalAddress
        }.getOrDefault(false)
    }

    private fun relativeAgeLabel(lastSeenMillis: Long): String {
        val ageSeconds = ((System.currentTimeMillis() - lastSeenMillis) / 1000L).coerceAtLeast(0L)
        return when {
            ageSeconds < 5 -> "just now"
            ageSeconds < 60 -> "${ageSeconds}s ago"
            ageSeconds < 3600 -> "${ageSeconds / 60}m ago"
            else -> "${ageSeconds / 3600}h ago"
        }
    }

    private fun detectTotalRamBytes(): Long? {
        val manager = appContext?.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager ?: return null
        val memoryInfo = ActivityManager.MemoryInfo()
        manager.getMemoryInfo(memoryInfo)
        return memoryInfo.totalMem.takeIf { it > 0L }
    }

    private fun detectAppMemoryPssBytes(): Long? {
        val manager = appContext?.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager ?: return null
        val memoryInfo = runCatching {
            manager.getProcessMemoryInfo(intArrayOf(Process.myPid())).firstOrNull()
        }.getOrNull() ?: return null
        val pssKb = memoryInfo.totalPss
        return pssKb.takeIf { it > 0 }?.toLong()?.times(1024L)
    }

    private fun detectStorageStats(): Pair<Long, Long>? {
        val filesDir = appContext?.filesDir ?: return null
        val statFs = runCatching { StatFs(filesDir.absolutePath) }.getOrNull() ?: return null
        val freeBytes = statFs.availableBytes
        val totalBytes = statFs.totalBytes
        if (freeBytes <= 0L || totalBytes <= 0L) return null
        return freeBytes to totalBytes
    }

    private fun detectBatteryPercent(): Int? {
        val batteryManager = appContext?.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager ?: return null
        val percent = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        return percent.takeIf { it in 1..100 }
    }

    private fun detectBatteryTemperatureC(): Double? {
        val context = appContext ?: return null
        val intent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED)) ?: return null
        val rawTenths = intent.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Int.MIN_VALUE)
        if (rawTenths == Int.MIN_VALUE) return null
        return rawTenths / 10.0
    }

    private fun detectThermalStatus(): String? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return null
        val powerManager = appContext?.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return null
        return when (powerManager.currentThermalStatus) {
            PowerManager.THERMAL_STATUS_NONE -> "none"
            PowerManager.THERMAL_STATUS_LIGHT -> "light"
            PowerManager.THERMAL_STATUS_MODERATE -> "moderate"
            PowerManager.THERMAL_STATUS_SEVERE -> "severe"
            PowerManager.THERMAL_STATUS_CRITICAL -> "critical"
            PowerManager.THERMAL_STATUS_EMERGENCY -> "emergency"
            PowerManager.THERMAL_STATUS_SHUTDOWN -> "shutdown"
            else -> "unknown"
        }
    }

    private fun detectCharging(): Boolean? {
        val context = appContext ?: return null
        val intent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED)) ?: return null
        val status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
        if (status == -1) return null
        return status == BatteryManager.BATTERY_STATUS_CHARGING ||
            status == BatteryManager.BATTERY_STATUS_FULL
    }

    private fun detectChargingSource(): String? {
        val context = appContext ?: return null
        val intent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED)) ?: return null
        val plugged = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1)
        return when (plugged) {
            BatteryManager.BATTERY_PLUGGED_AC -> "ac"
            BatteryManager.BATTERY_PLUGGED_USB -> "usb"
            BatteryManager.BATTERY_PLUGGED_WIRELESS -> "wireless"
            else -> null
        }
    }

    private fun detectBatteryOptimizationExempt(): Boolean? {
        val context = appContext ?: return null
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return null
        return powerManager.isIgnoringBatteryOptimizations(context.packageName)
    }

    private fun detectProcessCpuPercent(): Double? {
        val nowWall = SystemClock.elapsedRealtime()
        val nowCpu = Process.getElapsedCpuTime()
        val previous = lastCpuSample
        lastCpuSample = CpuSample(nowWall, nowCpu)
        if (previous == null) return null
        val wallDelta = nowWall - previous.wallMs
        val cpuDelta = nowCpu - previous.processCpuMs
        if (wallDelta <= 0L || cpuDelta < 0L) return null
        return (cpuDelta.toDouble() / wallDelta.toDouble()) * 100.0
    }

    private fun detectNetworkSnapshot(): NetworkSnapshot {
        val context = appContext
        val activeCandidates = mutableListOf<NetworkAddressCandidate>()
        val fallbackCandidates = mutableListOf<NetworkAddressCandidate>()

        val connectivityManager = context?.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        if (connectivityManager != null) {
            val networks = buildList {
                connectivityManager.activeNetwork?.let { add(it) }
                connectivityManager.allNetworks.forEach { network ->
                    if (network !in this) add(network)
                }
            }
            networks.forEachIndexed { index, network ->
                val linkProperties = connectivityManager.getLinkProperties(network) ?: return@forEachIndexed
                val capabilities = connectivityManager.getNetworkCapabilities(network)
                val transport = detectTransport(capabilities, linkProperties.interfaceName)
                val interfaceName = linkProperties.interfaceName.orEmpty()
                linkProperties.linkAddresses.forEach { address ->
                    val host = (address.address as? Inet4Address)?.hostAddress ?: return@forEach
                    if (!isUsableIpv4(host)) return@forEach
                    activeCandidates += NetworkAddressCandidate(
                        ip = host,
                        interfaceName = interfaceName,
                        transport = transport,
                        priority = transportPriority(transport, interfaceName, preferActive = index == 0)
                    )
                }
            }
        }

        try {
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            interfaces.forEach { networkInterface ->
                val interfaceName = networkInterface.name.orEmpty()
                Collections.list(networkInterface.inetAddresses).forEach { address ->
                    val host = (address as? Inet4Address)?.hostAddress ?: return@forEach
                    if (!isUsableIpv4(host)) return@forEach
                    fallbackCandidates += NetworkAddressCandidate(
                        ip = host,
                        interfaceName = interfaceName,
                        transport = detectTransport(null, interfaceName),
                        priority = transportPriority(detectTransport(null, interfaceName), interfaceName, preferActive = false)
                    )
                }
            }
        } catch (_: Exception) {
        }

        val candidates = (activeCandidates + fallbackCandidates)
            .distinctBy { it.ip }
            .sortedWith(compareBy<NetworkAddressCandidate> { it.priority }.thenBy { it.ip })

        val preferred = candidates.firstOrNull()
        val transport = preferred?.transport ?: if (candidates.isNotEmpty()) candidates.first().transport else null
        val addresses = candidates.map { it.ip }
        val interfaceNames = candidates.map { it.interfaceName }.filter { it.isNotBlank() }.distinct()
        return NetworkSnapshot(
            preferredIp = preferred?.ip,
            addresses = addresses,
            transport = transport,
            interfaceNames = interfaceNames,
            reachabilityHint = reachabilityHint(transport, addresses)
        )
    }

    private data class NetworkAddressCandidate(
        val ip: String,
        val interfaceName: String,
        val transport: String?,
        val priority: Int
    )

    private fun detectTransport(capabilities: NetworkCapabilities?, interfaceName: String?): String? {
        return when {
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true -> "wifi"
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) == true -> "ethernet"
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true -> "cellular"
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true -> "vpn"
            interfaceName.orEmpty().startsWith("wlan", ignoreCase = true) -> "wifi"
            interfaceName.orEmpty().startsWith("ap", ignoreCase = true) -> "hotspot"
            interfaceName.orEmpty().startsWith("eth", ignoreCase = true) -> "ethernet"
            interfaceName.orEmpty().startsWith("rmnet", ignoreCase = true) -> "cellular"
            else -> null
        }
    }

    private fun transportPriority(transport: String?, interfaceName: String, preferActive: Boolean): Int {
        val base = when (transport) {
            "wifi", "hotspot" -> 0
            "ethernet" -> 10
            "cellular" -> 30
            "vpn" -> 40
            else -> 50
        }
        val interfaceBias = when {
            interfaceName.startsWith("wlan", ignoreCase = true) -> 0
            interfaceName.startsWith("ap", ignoreCase = true) -> 1
            interfaceName.startsWith("eth", ignoreCase = true) -> 2
            interfaceName.startsWith("rmnet", ignoreCase = true) -> 5
            else -> 10
        }
        return base + interfaceBias + if (preferActive) -20 else 0
    }

    private fun isUsableIpv4(host: String): Boolean {
        return host.isNotBlank() &&
            !host.startsWith("127.") &&
            !host.startsWith("169.254.")
    }

    private fun reachabilityHint(transport: String?, addresses: List<String>): String {
        return when {
            addresses.isEmpty() ->
                "No LAN IPv4 address detected yet. Connect Wi-Fi or enable hotspot before testing nearby clients."
            transport == "wifi" || transport == "hotspot" ->
                "Nearby devices on the same Wi-Fi or Android hotspot should be able to reach this node over HTTP :17778 and HTTPS :17777."
            transport == "ethernet" ->
                "This node is on Ethernet. Nearby clients on the same LAN should reach it directly."
            transport == "cellular" ->
                "The active network looks cellular-only. Nearby LAN clients will not reach this node until Wi-Fi or hotspot is active."
            transport == "vpn" ->
                "A VPN is active. Nearby access may fail or use a different IP than expected."
            else ->
                "Use one of the advertised IPv4 addresses from another device on the same Wi-Fi or hotspot to test LAN access."
        }
    }

    private fun escape(raw: String): String = raw
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")

    private data class HttpResponse(
        val status: Int,
        val contentType: String,
        val body: ByteArray
    )
}
