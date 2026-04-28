package com.ihomenerd.home.runtime

import android.content.Context
import android.media.AudioFormat
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.Locale
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

data class AndroidTtsVoice(
    val name: String,
    val languageTag: String,
    val quality: Int,
    val latency: Int
)

data class AndroidTtsResult(
    val wavBytes: ByteArray,
    val voice: String,
    val languageTag: String,
    val sampleRateHz: Int
)

private data class PendingSynthesis(
    val utteranceId: String,
    val outputFile: File,
    val completion: CompletableDeferred<AndroidTtsResult> = CompletableDeferred(),
    val chunks: MutableList<ByteArray> = mutableListOf(),
    var sampleRateHz: Int = 0,
    var encoding: Int = AudioFormat.ENCODING_PCM_16BIT,
    var channelCount: Int = 1,
    var voiceName: String = "default",
    var languageTag: String = "en-US"
)

private data class PcmPayload(
    val bytes: ByteArray,
    val bitsPerSample: Int
)

object AndroidTtsEngine {
    private val lock = Any()
    private val pending = ConcurrentHashMap<String, PendingSynthesis>()

    @Volatile
    private var textToSpeech: TextToSpeech? = null

    @Volatile
    private var initDeferred: CompletableDeferred<Boolean>? = null

    @Volatile
    private var ready: Boolean = false

    suspend fun prewarm(context: Context): Boolean = ensureReady(context)

    fun isReady(): Boolean = ready

    fun shutdown() {
        synchronized(lock) {
            ready = false
            textToSpeech?.stop()
            textToSpeech?.shutdown()
            textToSpeech = null
            initDeferred?.cancel()
            initDeferred = null
        }
        pending.values.forEach { synthesis ->
            synthesis.outputFile.delete()
            synthesis.completion.completeExceptionally(
                IllegalStateException("Android TTS engine shut down before synthesis finished.")
            )
        }
        pending.clear()
    }

    suspend fun listVoices(context: Context): List<AndroidTtsVoice> {
        if (!ensureReady(context)) return emptyList()
        val engine = textToSpeech ?: return emptyList()
        return withContext(Dispatchers.Default) {
            (engine.voices ?: emptySet())
                .filterNotNull()
                .sortedWith(compareBy({ it.locale?.toLanguageTag().orEmpty() }, { it.name }))
                .map {
                    AndroidTtsVoice(
                        name = it.name,
                        languageTag = it.locale?.toLanguageTag().orEmpty(),
                        quality = it.quality,
                        latency = it.latency
                    )
                }
        }
    }

    suspend fun synthesize(
        context: Context,
        text: String,
        targetLang: String,
        voiceName: String?,
        speed: Float
    ): AndroidTtsResult {
        require(text.isNotBlank()) { "text is required" }
        if (!ensureReady(context)) {
            throw IllegalStateException("Android TTS engine is not available on this node.")
        }

        val engine = textToSpeech ?: throw IllegalStateException("Android TTS engine is not initialized.")
        val utteranceId = "ihn-tts-${UUID.randomUUID()}"
        val outputFile = File.createTempFile("ihn-tts-", ".wav", context.cacheDir)
        val synthesis = PendingSynthesis(utteranceId = utteranceId, outputFile = outputFile)
        pending[utteranceId] = synthesis

        val synthStatus = withContext(Dispatchers.Main) {
            val locale = resolveLocale(engine, targetLang)
            val voice = resolveVoice(engine, locale, voiceName)
            val languageStatus = engine.setLanguage(locale)
            if (languageStatus < TextToSpeech.LANG_AVAILABLE) {
                pending.remove(utteranceId)
                outputFile.delete()
                throw IllegalStateException("No Android TTS voice is available for ${locale.toLanguageTag()}.")
            }
            if (voice != null) {
                engine.voice = voice
            }
            engine.setSpeechRate(speed.coerceIn(0.5f, 2.0f))
            synthesis.languageTag = locale.toLanguageTag()
            synthesis.voiceName = engine.voice?.name ?: voice?.name ?: "default"
            engine.synthesizeToFile(text, Bundle(), outputFile, utteranceId)
        }

        if (synthStatus != TextToSpeech.SUCCESS) {
            pending.remove(utteranceId)
            outputFile.delete()
            throw IllegalStateException("Android TTS synthesis request was rejected by the platform engine.")
        }

        return try {
            withTimeout(20_000) { synthesis.completion.await() }
        } catch (exc: Exception) {
            pending.remove(utteranceId)
            outputFile.delete()
            throw exc
        }
    }

    private suspend fun ensureReady(context: Context): Boolean {
        textToSpeech?.let {
            if (ready) return true
        }

        val deferred = synchronized(lock) {
            if (ready && textToSpeech != null) return true
            initDeferred?.let { return@synchronized it }
            CompletableDeferred<Boolean>().also { initDeferred = it }
        }

        if (textToSpeech == null) {
            withContext(Dispatchers.Main) {
                if (textToSpeech != null) return@withContext
                val holder = arrayOfNulls<TextToSpeech>(1)
                holder[0] = TextToSpeech(context.applicationContext) { status ->
                    val engine = holder[0]
                    val success = status == TextToSpeech.SUCCESS && engine != null
                    synchronized(lock) {
                        ready = success
                        textToSpeech = if (success) engine else null
                    }
                    if (success) {
                        engine?.setOnUtteranceProgressListener(progressListener)
                    } else {
                        engine?.shutdown()
                    }
                    synchronized(lock) {
                        initDeferred?.complete(success)
                        initDeferred = null
                    }
                }
            }
        }

        return try {
            withTimeout(5_000) { deferred.await() }
        } catch (exc: Exception) {
            synchronized(lock) {
                if (initDeferred === deferred) {
                    initDeferred = null
                }
                ready = false
            }
            false
        }
    }

    private val progressListener = object : UtteranceProgressListener() {
        override fun onStart(utteranceId: String) = Unit

        override fun onDone(utteranceId: String) {
            val synthesis = pending.remove(utteranceId) ?: return
            try {
                val wavBytes = when {
                    synthesis.chunks.isNotEmpty() -> {
                        val pcm = ByteArrayOutputStream()
                        synthesis.chunks.forEach { pcm.write(it) }
                        val normalized = normalizePcm(pcm.toByteArray(), synthesis.encoding)
                        wrapAsWav(
                            pcmBytes = normalized.bytes,
                            sampleRateHz = synthesis.sampleRateHz.coerceAtLeast(16_000),
                            channelCount = synthesis.channelCount.coerceAtLeast(1),
                            bitsPerSample = normalized.bitsPerSample
                        )
                    }
                    synthesis.outputFile.exists() -> {
                        val bytes = synthesis.outputFile.readBytes()
                        if (!looksLikeWav(bytes)) {
                            throw IllegalStateException("Android TTS produced audio, but not in WAV form.")
                        }
                        bytes
                    }
                    else -> {
                        throw IllegalStateException("Android TTS completed without returning audio data.")
                    }
                }

                synthesis.completion.complete(
                    AndroidTtsResult(
                        wavBytes = wavBytes,
                        voice = synthesis.voiceName,
                        languageTag = synthesis.languageTag,
                        sampleRateHz = synthesis.sampleRateHz.coerceAtLeast(16_000)
                    )
                )
            } catch (exc: Exception) {
                synthesis.completion.completeExceptionally(exc)
            } finally {
                synthesis.outputFile.delete()
            }
        }

        override fun onError(utteranceId: String) {
            failPending(utteranceId, "Android TTS synthesis failed.")
        }

        override fun onError(utteranceId: String, errorCode: Int) {
            failPending(utteranceId, "Android TTS synthesis failed with code $errorCode.")
        }

        override fun onBeginSynthesis(
            utteranceId: String,
            sampleRateInHz: Int,
            audioFormat: Int,
            channelCount: Int
        ) {
            pending[utteranceId]?.apply {
                sampleRateHz = sampleRateInHz
                encoding = audioFormat
                this.channelCount = channelCount
            }
        }

        override fun onAudioAvailable(utteranceId: String, audio: ByteArray) {
            pending[utteranceId]?.chunks?.add(audio.copyOf())
        }
    }

    private fun failPending(utteranceId: String, message: String) {
        val synthesis = pending.remove(utteranceId) ?: return
        synthesis.outputFile.delete()
        synthesis.completion.completeExceptionally(IllegalStateException(message))
    }

    private fun resolveLocale(engine: TextToSpeech, targetLang: String): Locale {
        val requested = Locale.forLanguageTag(targetLang.ifBlank { "en-US" })
        if (engine.isLanguageAvailable(requested) >= TextToSpeech.LANG_AVAILABLE) {
            return requested
        }

        val fallback = engine.voices
            ?.firstOrNull { it.locale?.language == requested.language }
            ?.locale
        if (fallback != null) return fallback

        return Locale.US
    }

    private fun resolveVoice(engine: TextToSpeech, locale: Locale, voiceName: String?) =
        when {
            !voiceName.isNullOrBlank() -> engine.voices?.firstOrNull { it.name == voiceName }
            else -> engine.voices?.firstOrNull { it.locale == locale }
                ?: engine.voices?.firstOrNull { it.locale?.language == locale.language }
                ?: engine.voice
        }

    private fun normalizePcm(audio: ByteArray, encoding: Int): PcmPayload {
        return when (encoding) {
            AudioFormat.ENCODING_PCM_16BIT -> PcmPayload(audio, 16)
            AudioFormat.ENCODING_PCM_8BIT -> PcmPayload(audio, 8)
            AudioFormat.ENCODING_PCM_FLOAT -> {
                val source = ByteBuffer.wrap(audio).order(ByteOrder.LITTLE_ENDIAN)
                val output = ByteBuffer.allocate((audio.size / 4) * 2).order(ByteOrder.LITTLE_ENDIAN)
                while (source.remaining() >= 4) {
                    val sample = source.float.coerceIn(-1f, 1f)
                    output.putShort((sample * Short.MAX_VALUE).toInt().toShort())
                }
                PcmPayload(output.array(), 16)
            }
            else -> throw IllegalStateException("Unsupported Android TTS audio encoding: $encoding")
        }
    }

    private fun wrapAsWav(
        pcmBytes: ByteArray,
        sampleRateHz: Int,
        channelCount: Int,
        bitsPerSample: Int
    ): ByteArray {
        val byteRate = sampleRateHz * channelCount * bitsPerSample / 8
        val blockAlign = channelCount * bitsPerSample / 8
        val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN).apply {
            put("RIFF".toByteArray())
            putInt(36 + pcmBytes.size)
            put("WAVE".toByteArray())
            put("fmt ".toByteArray())
            putInt(16)
            putShort(1)
            putShort(channelCount.toShort())
            putInt(sampleRateHz)
            putInt(byteRate)
            putShort(blockAlign.toShort())
            putShort(bitsPerSample.toShort())
            put("data".toByteArray())
            putInt(pcmBytes.size)
        }.array()

        return ByteArrayOutputStream(header.size + pcmBytes.size).apply {
            write(header)
            write(pcmBytes)
        }.toByteArray()
    }

    private fun looksLikeWav(bytes: ByteArray): Boolean {
        if (bytes.size < 12) return false
        val riff = bytes.copyOfRange(0, 4).decodeToString()
        val wave = bytes.copyOfRange(8, 12).decodeToString()
        return riff == "RIFF" && wave == "WAVE"
    }
}
