package com.ihomenerd.home.runtime

import android.content.Context
import android.util.Log
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.ConversationConfig
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.LogSeverity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.io.File
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

data class AndroidChatResult(
    val content: String,
    val languageTag: String?,
    val backend: String,
    val modelId: String,
    val promptChars: Int,
    val responseChars: Int
)

private data class GemmaChatModelSpec(
    val id: String,
    val fileNames: List<String>,
    val maxTokens: Int
)

private data class ResolvedGemmaChatModel(
    val spec: GemmaChatModelSpec,
    val file: File
)

private data class InitializedGemmaChatEngine(
    val engine: Engine,
    val backendName: String
)

object AndroidChatEngine {
    private const val TAG = "AndroidChatEngine"
    private val busy = AtomicBoolean(false)
    private val engineLock = Any()
    private var initializedEngine: InitializedGemmaChatEngine? = null
    private var loadedModelPath: String? = null
    private var runtimeVerified: Boolean = false

    private val modelSpecs = listOf(
        GemmaChatModelSpec(
            id = "gemma-4-e2b-it",
            fileNames = listOf(
                "gemma-4-E2B-it.litertlm",
                "gemma-4-E2B-it-int4.litertlm",
                "gemma-4-E2B-it-int4.task",
                "gemma-4-E2B-it.task"
            ),
            maxTokens = 192
        ),
        GemmaChatModelSpec(
            id = "gemma-4-e4b-it",
            fileNames = listOf(
                "gemma-4-E4B-it.litertlm",
                "gemma-4-E4B-it-int4.litertlm",
                "gemma-4-E4B-it-int4.task",
                "gemma-4-E4B-it.task"
            ),
            maxTokens = 192
        )
    )

    suspend fun prewarm(context: Context): Boolean = withContext(Dispatchers.Default) {
        val model = availableModel(context) ?: return@withContext false
        runCatching {
            ensureEngine(context, model)
            synchronized(engineLock) {
                runtimeVerified = true
            }
        }.isSuccess
    }

    fun isReady(context: Context): Boolean {
        if (availableModel(context) == null) return false
        return synchronized(engineLock) { runtimeVerified && initializedEngine != null }
    }

    fun activeBackendName(): String? = synchronized(engineLock) { initializedEngine?.backendName }

    fun shutdown() {
        synchronized(engineLock) {
            runCatching { initializedEngine?.engine?.close() }
            initializedEngine = null
            loadedModelPath = null
            runtimeVerified = false
        }
    }

    suspend fun generate(
        context: Context,
        messages: JSONArray,
        languageHint: String? = null,
        modelOverride: String? = null
    ): AndroidChatResult {
        require(messages.length() > 0) { "messages must not be empty" }
        if (!busy.compareAndSet(false, true)) {
            throw IllegalStateException("Android chat is already processing another request.")
        }
        try {
            val model = selectModel(context, modelOverride)
            val prompt = buildPrompt(messages, normalizedLanguageTag(languageHint))
            if (prompt.isBlank()) {
                throw IllegalArgumentException("No usable chat messages were provided.")
            }
            val initialized = ensureEngine(context, model)
            val response = withContext(Dispatchers.Default) {
                initialized.engine
                    .createConversation(
                        ConversationConfig(
                            systemInstruction = null
                        )
                    )
                    .use { conversation ->
                        conversation.sendMessage(prompt).toString().trim()
                    }
            }
            if (response.isBlank()) {
                throw IllegalStateException("Android Gemma returned an empty response.")
            }
            synchronized(engineLock) {
                runtimeVerified = true
            }
            return AndroidChatResult(
                content = response,
                languageTag = normalizedLanguageTag(languageHint),
                backend = initialized.backendName,
                modelId = model.spec.id,
                promptChars = prompt.length,
                responseChars = response.length
            )
        } finally {
            busy.set(false)
        }
    }

    fun availableModelSummary(context: Context): String? {
        return availableModel(context)?.spec?.id
    }

    private fun selectModel(context: Context, modelOverride: String?): ResolvedGemmaChatModel {
        val available = resolvedModels(context)
        if (available.isEmpty()) {
            throw IllegalStateException(
                "No local Gemma model file was found on this Android node. Push a .litertlm or .task file into the app's llm directory first."
            )
        }
        val normalizedOverride = modelOverride?.trim()?.lowercase(Locale.US).orEmpty()
        if (normalizedOverride.isNotBlank()) {
            available.firstOrNull { candidate ->
                candidate.spec.id == normalizedOverride ||
                    candidate.file.name.lowercase(Locale.US) == normalizedOverride
            }?.let { return it }
        }
        return available.first()
    }

    private fun availableModel(context: Context): ResolvedGemmaChatModel? = resolvedModels(context).firstOrNull()

    private fun resolvedModels(context: Context): List<ResolvedGemmaChatModel> {
        val roots = candidateRoots(context)
        return modelSpecs.mapNotNull { spec ->
            spec.fileNames.firstNotNullOfOrNull { fileName ->
                roots.firstNotNullOfOrNull { root ->
                    val file = File(root, fileName)
                    if (file.isFile && file.canRead()) {
                        ResolvedGemmaChatModel(spec = spec, file = file)
                    } else {
                        null
                    }
                }
            }
        }
    }

    private fun candidateRoots(context: Context): List<File> {
        val roots = mutableListOf<File>()
        context.getExternalFilesDir(null)?.let { roots += File(it, "llm") }
        roots += File(context.filesDir, "llm")
        roots += File("/data/local/tmp/llm")
        return roots.distinctBy { it.absolutePath }
    }

    private fun ensureEngine(context: Context, model: ResolvedGemmaChatModel): InitializedGemmaChatEngine {
        synchronized(engineLock) {
            val existing = initializedEngine
            if (existing != null && loadedModelPath == model.file.absolutePath) {
                return existing
            }
        }

        val initialized = createEngineWithFallbacks(context, model)
        synchronized(engineLock) {
            runCatching { initializedEngine?.engine?.close() }
            initializedEngine = initialized
            loadedModelPath = model.file.absolutePath
            runtimeVerified = false
            return initialized
        }
    }

    private fun createEngineWithFallbacks(
        context: Context,
        model: ResolvedGemmaChatModel
    ): InitializedGemmaChatEngine {
        Engine.setNativeMinLogSeverity(LogSeverity.ERROR)
        val cacheDir = File(context.cacheDir, "litertlm")
        cacheDir.mkdirs()

        val backends = listOf(
            "gpu" to Backend.GPU(),
            "cpu" to Backend.CPU()
        )

        var lastFailure: Throwable? = null
        for ((backendName, backend) in backends) {
            try {
                Log.i(TAG, "Initializing LiteRT-LM engine with backend=$backendName model=${model.file.absolutePath}")
                val engine = Engine(
                    EngineConfig(
                        modelPath = model.file.absolutePath,
                        backend = backend,
                        maxNumTokens = model.spec.maxTokens,
                        cacheDir = cacheDir.absolutePath
                    )
                )
                engine.initialize()
                return InitializedGemmaChatEngine(
                    engine = engine,
                    backendName = "android_gemma_local_litertlm_$backendName"
                )
            } catch (failure: Throwable) {
                lastFailure = failure
                Log.w(
                    TAG,
                    "LiteRT-LM initialization failed for backend=$backendName model=${model.file.name}: ${failure.message}",
                    failure
                )
            }
        }

        throw IllegalStateException(
            buildString {
                append("LiteRT-LM failed to initialize on this Android node.")
                lastFailure?.message?.takeIf { it.isNotBlank() }?.let {
                    append(' ')
                    append(it)
                }
            },
            lastFailure
        )
    }

    private fun buildPrompt(messages: JSONArray, languageHint: String?): String {
        val usableMessages = buildList {
            for (index in 0 until messages.length()) {
                val message = messages.optJSONObject(index) ?: continue
                val role = message.optString("role").trim().lowercase(Locale.US)
                val content = message.optString("content").trim()
                if (content.isBlank()) continue
                if (role !in setOf("user", "assistant", "system")) continue
                add(role to content)
            }
        }.takeLast(8)

        if (usableMessages.isEmpty()) return ""

        val responseLanguage = when (languageHint?.lowercase(Locale.US)) {
            "en", "en-us", "en-gb" -> "English"
            "es", "es-es", "es-mx" -> "Spanish"
            "pt", "pt-br", "pt-pt" -> "Portuguese"
            "fr", "fr-fr" -> "French"
            "de", "de-de" -> "German"
            "it", "it-it" -> "Italian"
            "zh", "zh-cn", "zh-tw" -> "Chinese"
            "ja", "ja-jp" -> "Japanese"
            "ko", "ko-kr" -> "Korean"
            null -> "the same language as the user's latest message"
            else -> languageHint
        }

        val prompt = StringBuilder()
        prompt.appendLine("You are iHomeNerd, a concise local AI assistant running on an Android device.")
        prompt.appendLine("Answer directly, helpfully, and with short paragraphs unless the user asks for depth.")
        prompt.appendLine("Reply in $responseLanguage.")
        prompt.appendLine()
        usableMessages.forEach { (role, content) ->
            val label = when (role) {
                "assistant" -> "Assistant"
                "system" -> "System"
                else -> "User"
            }
            prompt.append(label)
                .append(": ")
                .append(content.replace("\n", " ").trim())
                .append('\n')
        }
        prompt.append("Assistant:")
        return prompt.toString()
    }

    private fun normalizedLanguageTag(languageHint: String?): String? {
        return languageHint
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?.replace('_', '-')
    }
}
