package com.ihomenerd.home.runtime

import android.content.Context
import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OfflineModelConfig
import com.k2fsa.sherpa.onnx.OfflineMoonshineModelConfig
import com.k2fsa.sherpa.onnx.OfflineRecognizer
import com.k2fsa.sherpa.onnx.OfflineRecognizerConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

data class AndroidAsrResult(
    val text: String,
    val languageTag: String?,
    val backend: String,
    val backendId: String,
    val audioBytes: Int
)

data class AndroidAsrBackendChoice(
    val id: String,
    val title: String,
    val backend: String,
    val languages: List<String>,
    val defaultLanguageTag: String,
    val note: String
)

private data class SherpaMoonshineModel(
    val id: String,
    val title: String,
    val assetDir: String,
    val languagePrefixes: Set<String>,
    val defaultLanguageTag: String,
    val featureSampleRateHz: Int,
    val backend: String,
    val note: String
)

private data class ParsedWavPayload(
    val samples: FloatArray,
    val sampleRateHz: Int
)

object AndroidAsrEngine {
    private val busy = AtomicBoolean(false)
    private val recognizers = ConcurrentHashMap<String, OfflineRecognizer>()
    private val recognizerLocks = ConcurrentHashMap<String, Any>()
    private val moonshineModels = listOf(
        SherpaMoonshineModel(
            id = "moonshine-base-en",
            title = "Moonshine English",
            assetDir = "asr-models/moonshine-base-en",
            languagePrefixes = setOf("en", "en-us", "en-gb"),
            defaultLanguageTag = "en-US",
            featureSampleRateHz = 24_000,
            backend = "sherpa_onnx_moonshine_en",
            note = "Fast English-only Moonshine speech model for short local utterances."
        ),
        SherpaMoonshineModel(
            id = "moonshine-base-es",
            title = "Moonshine Spanish",
            assetDir = "asr-models/moonshine-base-es",
            languagePrefixes = setOf("es", "es-es", "es-mx"),
            defaultLanguageTag = "es-ES",
            featureSampleRateHz = 22_050,
            backend = "sherpa_onnx_moonshine_es",
            note = "Fast Spanish-focused Moonshine speech model for local practice turns."
        )
    )

    suspend fun prewarm(context: Context): Boolean = withContext(Dispatchers.Default) {
        if (!isReady(context)) return@withContext false
        runCatching {
            recognizerFor(
                context,
                availableModels(context).firstOrNull() ?: error("No Sherpa ASR models are available.")
            )
        }.isSuccess
    }

    fun isReady(context: Context): Boolean = availableModels(context).isNotEmpty()

    fun availableBackendChoices(context: Context): List<AndroidAsrBackendChoice> {
        return availableModels(context).map { model ->
            AndroidAsrBackendChoice(
                id = model.id,
                title = model.title,
                backend = model.backend,
                languages = model.languagePrefixes
                    .map { prefix -> prefix.uppercaseLanguageTag() }
                    .distinct()
                    .sorted(),
                defaultLanguageTag = model.defaultLanguageTag,
                note = model.note
            )
        }
    }

    fun shutdown() {
        recognizers.values.forEach { recognizer ->
            runCatching { recognizer.release() }
        }
        recognizers.clear()
        recognizerLocks.clear()
    }

    suspend fun transcribe(
        context: Context,
        audioBytes: ByteArray,
        mimeType: String,
        languageHint: String? = null,
        backendHint: String? = null
    ): AndroidAsrResult {
        require(audioBytes.isNotEmpty()) { "audio payload is empty" }
        if (!busy.compareAndSet(false, true)) {
            throw IllegalStateException("Android ASR is already processing another request.")
        }
        try {
            val model = selectModel(context, languageHint, backendHint)
            val parsed = withContext(Dispatchers.Default) {
                parseUploadedAudio(audioBytes, mimeType)
            }
            val preparedSamples = withContext(Dispatchers.Default) {
                prepareSamplesForModel(parsed, model)
            }
            if (preparedSamples.isEmpty()) {
                throw IllegalStateException("Sherpa ASR received an empty audio waveform.")
            }
            val recognizer = recognizerFor(context, model)
            val recognizerLock = recognizerLocks.getOrPut(model.id) { Any() }
            val transcripts = withContext(Dispatchers.Default) {
                segmentForDecode(preparedSamples, model.featureSampleRateHz).mapNotNull { segment ->
                    val stream = recognizer.createStream()
                    try {
                        stream.acceptWaveform(segment, model.featureSampleRateHz)
                        val result = synchronized(recognizerLock) {
                            recognizer.decode(stream)
                            recognizer.getResult(stream)
                        }
                        result.text.trim().takeIf { it.isNotBlank() }
                    } finally {
                        runCatching { stream.release() }
                    }
                }
            }
            val text = transcripts.joinToString(" ").trim()
            if (text.isBlank()) {
                throw IllegalStateException("Sherpa ASR returned no speech match.")
            }
            return AndroidAsrResult(
                text = text,
                languageTag = model.defaultLanguageTag,
                backend = model.backend,
                backendId = model.id,
                audioBytes = audioBytes.size
            )
        } finally {
            busy.set(false)
        }
    }

    private fun availableModels(context: Context): List<SherpaMoonshineModel> {
        return moonshineModels.filter { model ->
            hasAsset(context, "${model.assetDir}/encoder_model.ort") &&
                hasAsset(context, "${model.assetDir}/decoder_model_merged.ort") &&
                hasAsset(context, "${model.assetDir}/tokens.txt")
        }
    }

    private fun hasAsset(context: Context, path: String): Boolean {
        return runCatching {
            context.assets.open(path).use { input ->
                input.read()
            }
            true
        }.getOrElse { false }
    }

    private fun selectModel(
        context: Context,
        languageHint: String?,
        backendHint: String?
    ): SherpaMoonshineModel {
        val available = availableModels(context)
        if (available.isEmpty()) {
            throw IllegalStateException("Sherpa ASR models are not installed on this node.")
        }
        val normalizedBackend = backendHint
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?.lowercase(Locale.US)
            ?.takeUnless { it == "auto" || it == "default" }
        if (!normalizedBackend.isNullOrBlank()) {
            return available.firstOrNull { model ->
                normalizedBackend == model.id.lowercase(Locale.US) ||
                    normalizedBackend == model.backend.lowercase(Locale.US)
            } ?: throw IllegalStateException(
                "Requested ASR backend '$backendHint' is not installed on this Android node."
            )
        }
        val normalizedLanguage = normalizedLanguageTag(languageHint)?.lowercase(Locale.US)
        if (normalizedLanguage.isNullOrBlank()) {
            return available.firstOrNull { it.languagePrefixes.contains("en") } ?: available.first()
        }
        return available.firstOrNull { model ->
            normalizedLanguage in model.languagePrefixes ||
                model.languagePrefixes.any { prefix -> normalizedLanguage.startsWith(prefix) }
        } ?: throw IllegalStateException("Local ASR currently supports English and Spanish on this Android node.")
    }

    private fun recognizerFor(context: Context, model: SherpaMoonshineModel): OfflineRecognizer {
        return recognizers.getOrPut(model.id) {
            createRecognizer(context, model)
        }
    }

    private fun createRecognizer(context: Context, model: SherpaMoonshineModel): OfflineRecognizer {
        val moonshineConfig = OfflineMoonshineModelConfig().apply {
            encoder = "${model.assetDir}/encoder_model.ort"
            mergedDecoder = "${model.assetDir}/decoder_model_merged.ort"
        }
        val modelConfig = OfflineModelConfig().apply {
            moonshine = moonshineConfig
            tokens = "${model.assetDir}/tokens.txt"
            numThreads = suggestedThreadCount()
            debug = false
            provider = "cpu"
            modelType = "moonshine"
        }
        val recognizerConfig = OfflineRecognizerConfig().apply {
            featConfig = FeatureConfig().apply {
                sampleRate = model.featureSampleRateHz
                featureDim = 80
                dither = 0f
            }
            this.modelConfig = modelConfig
            decodingMethod = "greedy_search"
        }
        return OfflineRecognizer(context.assets, recognizerConfig)
    }

    private fun suggestedThreadCount(): Int {
        return Runtime.getRuntime().availableProcessors()
            .coerceAtLeast(1)
            .coerceAtMost(4)
    }

    private fun parseUploadedAudio(audioBytes: ByteArray, mimeType: String): ParsedWavPayload {
        if (!mimeType.contains("wav", ignoreCase = true) && !looksLikeWav(audioBytes)) {
            throw IllegalArgumentException("Sherpa ASR expects WAV uploads from the browser on this node.")
        }
        return parseWav(audioBytes)
    }

    private fun parseWav(bytes: ByteArray): ParsedWavPayload {
        if (!looksLikeWav(bytes)) {
            throw IllegalArgumentException("Uploaded audio is not a valid WAV file.")
        }
        var offset = 12
        var audioFormat = 0
        var channelCount = 0
        var sampleRateHz = 0
        var bitsPerSample = 0
        var dataOffset = -1
        var dataSize = 0

        while (offset + 8 <= bytes.size) {
            val chunkId = bytes.copyOfRange(offset, offset + 4).decodeToString()
            val chunkSize = readIntLe(bytes, offset + 4)
            val chunkDataOffset = offset + 8
            if (chunkDataOffset + chunkSize > bytes.size) {
                break
            }
            when (chunkId) {
                "fmt " -> {
                    audioFormat = readShortLe(bytes, chunkDataOffset).toInt() and 0xffff
                    channelCount = readShortLe(bytes, chunkDataOffset + 2).toInt() and 0xffff
                    sampleRateHz = readIntLe(bytes, chunkDataOffset + 4)
                    bitsPerSample = readShortLe(bytes, chunkDataOffset + 14).toInt() and 0xffff
                }
                "data" -> {
                    dataOffset = chunkDataOffset
                    dataSize = chunkSize
                }
            }
            offset = chunkDataOffset + chunkSize + (chunkSize and 1)
        }

        if (audioFormat == 0 || channelCount <= 0 || sampleRateHz <= 0 || dataOffset < 0 || dataSize <= 0) {
            throw IllegalArgumentException("Uploaded WAV payload is missing required PCM metadata.")
        }

        val data = ByteBuffer.wrap(bytes, dataOffset, dataSize).order(ByteOrder.LITTLE_ENDIAN)
        val samples = when {
            audioFormat == 1 && bitsPerSample == 16 -> decodePcm16(data, channelCount)
            audioFormat == 3 && bitsPerSample == 32 -> decodeFloat32(data, channelCount)
            else -> throw IllegalArgumentException(
                "Sherpa ASR only supports PCM16 or float32 WAV uploads right now (got format=$audioFormat bits=$bitsPerSample)."
            )
        }

        return ParsedWavPayload(
            samples = samples,
            sampleRateHz = sampleRateHz
        )
    }

    private fun prepareSamplesForModel(parsed: ParsedWavPayload, model: SherpaMoonshineModel): FloatArray {
        val normalized = normalizeAmplitude(parsed.samples)
        return if (parsed.sampleRateHz == model.featureSampleRateHz) {
            normalized
        } else {
            resampleMono(normalized, parsed.sampleRateHz, model.featureSampleRateHz)
        }
    }

    private fun segmentForDecode(samples: FloatArray, sampleRateHz: Int): List<FloatArray> {
        val maxSegmentSamples = (sampleRateHz * 7.5f).toInt().coerceAtLeast(1)
        if (samples.size <= maxSegmentSamples) return listOf(samples)

        val targetSegmentSamples = (sampleRateHz * 6.5f).toInt().coerceAtLeast(1)
        val minSegmentSamples = (sampleRateHz * 2.5f).toInt().coerceAtLeast(1)
        val searchWindowSamples = (sampleRateHz * 1.0f).toInt().coerceAtLeast(1)
        val quietRunSamples = (sampleRateHz * 0.12f).toInt().coerceAtLeast(1)
        val silenceThreshold = 0.015f
        val segments = mutableListOf<FloatArray>()
        var start = 0

        while (start < samples.size) {
            val remaining = samples.size - start
            if (remaining <= maxSegmentSamples) {
                segments += samples.copyOfRange(start, samples.size)
                break
            }

            val targetEnd = (start + targetSegmentSamples).coerceAtMost(samples.size)
            val searchStart = (targetEnd - searchWindowSamples).coerceAtLeast(start + minSegmentSamples)
            val searchEnd = (targetEnd + searchWindowSamples).coerceAtMost(start + maxSegmentSamples).coerceAtMost(samples.size)
            var cut = findSilenceBoundary(
                samples = samples,
                start = searchStart,
                endExclusive = searchEnd,
                quietRunSamples = quietRunSamples,
                silenceThreshold = silenceThreshold
            )
            if (cut <= start + minSegmentSamples) {
                cut = (start + maxSegmentSamples).coerceAtMost(samples.size)
            }
            segments += samples.copyOfRange(start, cut)
            start = cut
        }

        return segments
    }

    private fun findSilenceBoundary(
        samples: FloatArray,
        start: Int,
        endExclusive: Int,
        quietRunSamples: Int,
        silenceThreshold: Float
    ): Int {
        var quietStart = -1
        var quietCount = 0
        for (index in start until endExclusive) {
            if (kotlin.math.abs(samples[index]) <= silenceThreshold) {
                if (quietStart < 0) quietStart = index
                quietCount += 1
                if (quietCount >= quietRunSamples) {
                    return quietStart + quietCount / 2
                }
            } else {
                quietStart = -1
                quietCount = 0
            }
        }
        return -1
    }

    private fun decodePcm16(buffer: ByteBuffer, channelCount: Int): FloatArray {
        val frameCount = buffer.remaining() / (2 * channelCount)
        val samples = FloatArray(frameCount)
        for (frameIndex in 0 until frameCount) {
            var mixed = 0f
            for (channel in 0 until channelCount) {
                mixed += buffer.short / 32768f
            }
            samples[frameIndex] = mixed / channelCount
        }
        return samples
    }

    private fun decodeFloat32(buffer: ByteBuffer, channelCount: Int): FloatArray {
        val frameCount = buffer.remaining() / (4 * channelCount)
        val samples = FloatArray(frameCount)
        for (frameIndex in 0 until frameCount) {
            var mixed = 0f
            for (channel in 0 until channelCount) {
                mixed += buffer.float
            }
            samples[frameIndex] = mixed / channelCount
        }
        return samples
    }

    private fun normalizeAmplitude(samples: FloatArray): FloatArray {
        var peak = 0f
        for (sample in samples) {
            peak = maxOf(peak, kotlin.math.abs(sample))
        }
        if (peak <= 0f || peak >= 0.95f) {
            return samples
        }
        val gain = minOf(8f, 0.92f / peak)
        val normalized = FloatArray(samples.size)
        for (index in samples.indices) {
            normalized[index] = (samples[index] * gain).coerceIn(-1f, 1f)
        }
        return normalized
    }

    private fun resampleMono(samples: FloatArray, sourceRate: Int, targetRate: Int): FloatArray {
        if (sourceRate == targetRate || samples.isEmpty()) return samples
        val targetLength = maxOf(1, (samples.size.toLong() * targetRate / sourceRate).toInt())
        val result = FloatArray(targetLength)
        val ratio = sourceRate.toDouble() / targetRate.toDouble()
        for (index in 0 until targetLength) {
            val sourcePosition = index * ratio
            val leftIndex = kotlin.math.floor(sourcePosition).toInt().coerceIn(0, samples.lastIndex)
            val rightIndex = (leftIndex + 1).coerceAtMost(samples.lastIndex)
            val weight = (sourcePosition - leftIndex).toFloat()
            result[index] = samples[leftIndex] * (1f - weight) + samples[rightIndex] * weight
        }
        return result
    }

    private fun looksLikeWav(bytes: ByteArray): Boolean {
        if (bytes.size < 12) return false
        val riff = bytes.copyOfRange(0, 4).decodeToString()
        val wave = bytes.copyOfRange(8, 12).decodeToString()
        return riff == "RIFF" && wave == "WAVE"
    }

    private fun readIntLe(bytes: ByteArray, offset: Int): Int {
        return ByteBuffer.wrap(bytes, offset, 4)
            .order(ByteOrder.LITTLE_ENDIAN)
            .int
    }

    private fun readShortLe(bytes: ByteArray, offset: Int): Short {
        return ByteBuffer.wrap(bytes, offset, 2)
            .order(ByteOrder.LITTLE_ENDIAN)
            .short
    }

    private fun normalizedLanguageTag(languageHint: String?): String? {
        val raw = languageHint?.trim().orEmpty()
        if (raw.isBlank()) return null
        return Locale.forLanguageTag(raw).toLanguageTag().takeIf { it.isNotBlank() }
    }

    private fun String.uppercaseLanguageTag(): String {
        val normalized = normalizedLanguageTag(this) ?: return this
        return normalized
            .split('-')
            .mapIndexed { index, part ->
                when (index) {
                    0 -> part.lowercase(Locale.US)
                    1 -> part.uppercase(Locale.US)
                    else -> part
                }
            }
            .joinToString("-")
    }
}
