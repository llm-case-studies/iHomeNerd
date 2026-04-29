package com.ihomenerd.home.runtime
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.google.android.gms.tasks.Task
import com.google.mlkit.nl.languageid.LanguageIdentification
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.math.min

data class AndroidOcrResult(
    val text: String,
    val backend: String,
    val model: String,
    val imageBytes: Int,
    val mode: String,
    val requestedLanguage: String?,
    val detectedLanguage: String?,
    val legibilityScore: Double,
    val candidateCount: Int,
    val warning: String?
)

private data class OcrCandidateResult(
    val text: String,
    val backend: String,
    val model: String,
    val detectedLanguage: String?,
    val legibilityScore: Double
)

private data class ScriptStats(
    val visibleChars: Int,
    val readableChars: Int,
    val latinChars: Int,
    val hanChars: Int,
    val hiraganaChars: Int,
    val katakanaChars: Int,
    val hangulChars: Int,
    val cyrillicChars: Int,
    val digitChars: Int,
    val punctuationChars: Int,
    val weirdChars: Int
)

private enum class OcrBackendSpec(
    val id: String,
    val backendName: String,
    val modelName: String
) {
    LATIN(
        id = "latin",
        backendName = "android_mlkit_text_recognition",
        modelName = "mlkit_text_recognition_latin"
    ) {
        override fun createRecognizer(): TextRecognizer =
            TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    },
    CHINESE(
        id = "chinese",
        backendName = "android_mlkit_text_recognition",
        modelName = "mlkit_text_recognition_chinese"
    ) {
        override fun createRecognizer(): TextRecognizer =
            TextRecognition.getClient(ChineseTextRecognizerOptions.Builder().build())
    },
    JAPANESE(
        id = "japanese",
        backendName = "android_mlkit_text_recognition",
        modelName = "mlkit_text_recognition_japanese"
    ) {
        override fun createRecognizer(): TextRecognizer =
            TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())
    },
    KOREAN(
        id = "korean",
        backendName = "android_mlkit_text_recognition",
        modelName = "mlkit_text_recognition_korean"
    ) {
        override fun createRecognizer(): TextRecognizer =
            TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
    };

    abstract fun createRecognizer(): TextRecognizer
}

object AndroidOcrEngine {
    private const val BACKEND = "android_mlkit_text_recognition"
    private const val MODEL = "mlkit_text_recognition_router_v1"
    private val SUPPORTED_MIME_TYPES = listOf(
        "image/jpeg",
        "image/png",
        "image/webp"
    )
    private val SUPPORTED_LANGUAGE_HINTS = listOf(
        "auto",
        "en",
        "es",
        "pt",
        "fr",
        "de",
        "it",
        "zh",
        "ja",
        "ko"
    )
    private val SUPPORTED_MODES = listOf("fast", "thorough")
    private val LATIN_LANGUAGE_ROOTS = setOf(
        "en", "es", "pt", "fr", "de", "it", "nl", "pl", "cs", "sk", "sl", "hr", "ro",
        "hu", "sv", "no", "da", "fi", "tr", "vi", "id", "ms"
    )

    fun isReady(): Boolean = true

    fun backendName(): String = BACKEND

    fun modelName(): String = MODEL

    fun supportedMimeTypes(): List<String> = SUPPORTED_MIME_TYPES

    fun supportedLanguageHints(): List<String> = SUPPORTED_LANGUAGE_HINTS

    fun supportedModes(): List<String> = SUPPORTED_MODES

    suspend fun extractText(
        imageBytes: ByteArray,
        mimeType: String? = null,
        languageHint: String? = null,
        mode: String? = null
    ): AndroidOcrResult {
        require(imageBytes.isNotEmpty()) { "image payload is empty" }
        validateMimeType(mimeType)

        val normalizedMode = normalizeMode(mode)
        val normalizedLanguageHint = normalizeLanguageHint(languageHint)
        val backendPlan = chooseBackends(normalizedLanguageHint, normalizedMode)

        val bitmap = withContext(Dispatchers.Default) {
            decodeBitmap(imageBytes)
        }

        return try {
            val candidates = coroutineScope {
                backendPlan.map { backend ->
                    async(Dispatchers.Default) {
                        runCandidate(
                            bitmap = bitmap,
                            backend = backend,
                            requestedLanguage = normalizedLanguageHint
                        )
                    }
                }.awaitAll()
            }.filterNotNull()

            if (candidates.isEmpty()) {
                throw IllegalStateException("Android OCR did not detect any text in the image.")
            }

            val best = candidates.maxByOrNull { it.legibilityScore }
                ?: throw IllegalStateException("Android OCR did not detect any text in the image.")
            val warning = if (best.legibilityScore < 0.46) {
                "OCR result may be unreliable on this node. Try Thorough mode or a different language hint."
            } else {
                null
            }

            AndroidOcrResult(
                text = best.text,
                backend = best.backend,
                model = best.model,
                imageBytes = imageBytes.size,
                mode = normalizedMode,
                requestedLanguage = normalizedLanguageHint,
                detectedLanguage = best.detectedLanguage,
                legibilityScore = best.legibilityScore,
                candidateCount = candidates.size,
                warning = warning
            )
        } finally {
            if (!bitmap.isRecycled) {
                bitmap.recycle()
            }
        }
    }

    private suspend fun runCandidate(
        bitmap: Bitmap,
        backend: OcrBackendSpec,
        requestedLanguage: String?
    ): OcrCandidateResult? {
        val recognizer = backend.createRecognizer()
        return try {
            val inputImage = InputImage.fromBitmap(bitmap, 0)
            val visionText = recognizer.process(inputImage).awaitResult()
            val text = visionText.text.trim()
            if (text.isBlank()) {
                null
            } else {
                val detectedLanguage = identifyLanguage(text)
                OcrCandidateResult(
                    text = text,
                    backend = backend.backendName,
                    model = backend.modelName,
                    detectedLanguage = detectedLanguage,
                    legibilityScore = scoreLegibility(
                        text = text,
                        backend = backend,
                        requestedLanguage = requestedLanguage,
                        detectedLanguage = detectedLanguage
                    )
                )
            }
        } finally {
            runCatching { recognizer.close() }
        }
    }

    private suspend fun identifyLanguage(text: String): String? {
        val normalized = text.trim()
        if (normalized.length < 3) return null
        val identifier = LanguageIdentification.getClient()
        return try {
            val detected = identifier.identifyLanguage(normalized).awaitResult()
            detected?.takeUnless { it == "und" || it.isBlank() }?.lowercase()
        } finally {
            runCatching { identifier.close() }
        }
    }

    private fun normalizeMode(mode: String?): String {
        val normalized = mode?.trim()?.lowercase().orEmpty()
        return when (normalized) {
            "thorough" -> "thorough"
            else -> "fast"
        }
    }

    private fun normalizeLanguageHint(languageHint: String?): String? {
        val normalized = languageHint?.trim()?.lowercase().orEmpty()
        if (normalized.isBlank() || normalized == "auto") return null
        return normalized.substringBefore('-')
    }

    private fun chooseBackends(languageHint: String?, mode: String): List<OcrBackendSpec> {
        if (mode == "thorough") {
            return when (languageHint) {
                "zh" -> listOf(OcrBackendSpec.CHINESE, OcrBackendSpec.LATIN, OcrBackendSpec.JAPANESE, OcrBackendSpec.KOREAN)
                "ja" -> listOf(OcrBackendSpec.JAPANESE, OcrBackendSpec.LATIN, OcrBackendSpec.CHINESE, OcrBackendSpec.KOREAN)
                "ko" -> listOf(OcrBackendSpec.KOREAN, OcrBackendSpec.LATIN, OcrBackendSpec.CHINESE, OcrBackendSpec.JAPANESE)
                else -> listOf(OcrBackendSpec.LATIN, OcrBackendSpec.CHINESE, OcrBackendSpec.JAPANESE, OcrBackendSpec.KOREAN)
            }
        }

        return when (languageHint) {
            "zh" -> listOf(OcrBackendSpec.CHINESE)
            "ja" -> listOf(OcrBackendSpec.JAPANESE)
            "ko" -> listOf(OcrBackendSpec.KOREAN)
            else -> listOf(OcrBackendSpec.LATIN)
        }
    }

    private fun scoreLegibility(
        text: String,
        backend: OcrBackendSpec,
        requestedLanguage: String?,
        detectedLanguage: String?
    ): Double {
        val stats = analyzeScripts(text)
        if (stats.visibleChars == 0) return 0.0

        val readableRatio = stats.readableChars.toDouble() / stats.visibleChars.toDouble()
        val weirdRatio = stats.weirdChars.toDouble() / stats.visibleChars.toDouble()
        val fragmentPenalty = shortFragmentPenalty(text)
        val lengthBonus = min(1.0, stats.visibleChars / 28.0)

        val targetScriptRatio = when (backend) {
            OcrBackendSpec.LATIN -> (stats.latinChars + stats.digitChars).toDouble() / stats.visibleChars.toDouble()
            OcrBackendSpec.CHINESE -> (stats.hanChars + stats.latinChars + stats.digitChars).toDouble() / stats.visibleChars.toDouble()
            OcrBackendSpec.JAPANESE -> (
                stats.hanChars + stats.hiraganaChars + stats.katakanaChars + stats.latinChars + stats.digitChars
            ).toDouble() / stats.visibleChars.toDouble()
            OcrBackendSpec.KOREAN -> (
                stats.hangulChars + stats.hanChars + stats.latinChars + stats.digitChars
            ).toDouble() / stats.visibleChars.toDouble()
        }

        val requestedLanguageBonus = when {
            requestedLanguage == null -> 0.0
            isLanguageCompatibleWithBackend(requestedLanguage, backend) -> 1.0
            else -> 0.0
        }
        val detectedLanguageBonus = when {
            detectedLanguage == null -> 0.0
            isLanguageCompatibleWithBackend(detectedLanguage, backend) -> 1.0
            else -> 0.0
        }
        val detectionAgreementBonus = when {
            requestedLanguage == null || detectedLanguage == null -> 0.0
            requestedLanguage == detectedLanguage -> 1.0
            else -> 0.0
        }

        val rawScore = (
            readableRatio * 0.34 +
                targetScriptRatio * 0.28 +
                lengthBonus * 0.14 +
                requestedLanguageBonus * 0.08 +
                detectedLanguageBonus * 0.08 +
                detectionAgreementBonus * 0.08 -
                weirdRatio * 0.22 -
                fragmentPenalty * 0.16
            )

        return rawScore.coerceIn(0.0, 1.0)
    }

    private fun analyzeScripts(text: String): ScriptStats {
        var visibleChars = 0
        var readableChars = 0
        var latinChars = 0
        var hanChars = 0
        var hiraganaChars = 0
        var katakanaChars = 0
        var hangulChars = 0
        var cyrillicChars = 0
        var digitChars = 0
        var punctuationChars = 0
        var weirdChars = 0

        var index = 0
        while (index < text.length) {
            val codePoint = text.codePointAt(index)
            index += Character.charCount(codePoint)
            if (Character.isWhitespace(codePoint)) {
                continue
            }

            visibleChars += 1
            when {
                Character.isDigit(codePoint) -> {
                    digitChars += 1
                    readableChars += 1
                }
                isReadablePunctuation(codePoint) -> {
                    punctuationChars += 1
                    readableChars += 1
                }
                else -> when (Character.UnicodeScript.of(codePoint)) {
                    Character.UnicodeScript.LATIN -> {
                        latinChars += 1
                        readableChars += 1
                    }
                    Character.UnicodeScript.HAN -> {
                        hanChars += 1
                        readableChars += 1
                    }
                    Character.UnicodeScript.HIRAGANA -> {
                        hiraganaChars += 1
                        readableChars += 1
                    }
                    Character.UnicodeScript.KATAKANA -> {
                        katakanaChars += 1
                        readableChars += 1
                    }
                    Character.UnicodeScript.HANGUL -> {
                        hangulChars += 1
                        readableChars += 1
                    }
                    Character.UnicodeScript.CYRILLIC -> {
                        cyrillicChars += 1
                        readableChars += 1
                    }
                    else -> {
                        weirdChars += 1
                    }
                }
            }
        }

        return ScriptStats(
            visibleChars = visibleChars,
            readableChars = readableChars,
            latinChars = latinChars,
            hanChars = hanChars,
            hiraganaChars = hiraganaChars,
            katakanaChars = katakanaChars,
            hangulChars = hangulChars,
            cyrillicChars = cyrillicChars,
            digitChars = digitChars,
            punctuationChars = punctuationChars,
            weirdChars = weirdChars
        )
    }

    private fun shortFragmentPenalty(text: String): Double {
        val fragments = text
            .split('\n')
            .map { it.trim() }
            .filter { it.isNotBlank() }
        if (fragments.isEmpty()) return 1.0
        val shortFragments = fragments.count { it.length <= 1 }
        return shortFragments.toDouble() / fragments.size.toDouble()
    }

    private fun isLanguageCompatibleWithBackend(languageTag: String, backend: OcrBackendSpec): Boolean {
        val root = languageTag.lowercase().substringBefore('-')
        return when (backend) {
            OcrBackendSpec.LATIN -> root in LATIN_LANGUAGE_ROOTS
            OcrBackendSpec.CHINESE -> root == "zh"
            OcrBackendSpec.JAPANESE -> root == "ja"
            OcrBackendSpec.KOREAN -> root == "ko"
        }
    }

    private fun isReadablePunctuation(codePoint: Int): Boolean {
        return when (Character.getType(codePoint)) {
            Character.CONNECTOR_PUNCTUATION.toInt(),
            Character.DASH_PUNCTUATION.toInt(),
            Character.START_PUNCTUATION.toInt(),
            Character.END_PUNCTUATION.toInt(),
            Character.OTHER_PUNCTUATION.toInt(),
            Character.MATH_SYMBOL.toInt(),
            Character.CURRENCY_SYMBOL.toInt() -> true
            else -> false
        }
    }

    private fun validateMimeType(mimeType: String?) {
        val normalized = mimeType?.trim()?.lowercase().orEmpty()
        if (normalized.isBlank()) return
        if (SUPPORTED_MIME_TYPES.any { normalized.startsWith(it) }) return
        if (normalized.startsWith("image/")) return
        throw IllegalArgumentException(
            "Android OCR expects an image upload (jpeg, png, or webp) on this node."
        )
    }

    private fun decodeBitmap(imageBytes: ByteArray): Bitmap {
        val options = BitmapFactory.Options().apply {
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        return BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size, options)
            ?: throw IllegalArgumentException("Uploaded payload is not a decodable image.")
    }

    private suspend fun <T> Task<T>.awaitResult(): T =
        suspendCancellableCoroutine { continuation ->
            addOnSuccessListener { result ->
                if (continuation.isActive) {
                    continuation.resume(result)
                }
            }
            addOnFailureListener { error ->
                if (continuation.isActive) {
                    continuation.resumeWithException(error)
                }
            }
            addOnCanceledListener {
                if (continuation.isActive) {
                    continuation.cancel()
                }
            }
        }
}
