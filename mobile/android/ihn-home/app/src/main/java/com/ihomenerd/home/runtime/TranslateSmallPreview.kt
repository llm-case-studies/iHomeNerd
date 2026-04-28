package com.ihomenerd.home.runtime

data class TranslatePreviewResult(
    val available: Boolean,
    val normalized: String,
    val translation: String,
    val matchedBy: String,
    val note: String
)

object TranslateSmallPreview {
    private val phrasebook = mapOf(
        "ni3 hao3" to "hello",
        "xie4 xie" to "thank you",
        "zai4 jian4" to "goodbye",
        "qing3" to "please",
        "dui4 bu qi3" to "sorry",
        "wo3 xiang3 xue2 zhong1 wen2" to "I want to learn Chinese",
        "ni3 hao3 ma" to "how are you",
        "wo3 ting1 bu dong3" to "I do not understand",
        "你好" to "hello",
        "谢谢" to "thank you",
        "再见" to "goodbye",
        "请" to "please",
        "对不起" to "sorry",
        "我想学中文" to "I want to learn Chinese",
        "你好吗" to "how are you",
        "我听不懂" to "I do not understand"
    )

    fun translate(input: String): TranslatePreviewResult {
        val trimmed = input.trim()
        val normalized = PronuncoPinyinTools.normalize(trimmed)

        phrasebook[trimmed]?.let { translation ->
            return TranslatePreviewResult(
                available = true,
                normalized = normalized,
                translation = translation,
                matchedBy = "direct",
                note = "Preview phrasebook match."
            )
        }

        phrasebook[normalized]?.let { translation ->
            return TranslatePreviewResult(
                available = true,
                normalized = normalized,
                translation = translation,
                matchedBy = "normalized_pinyin",
                note = "Preview phrasebook match after pinyin normalization."
            )
        }

        return TranslatePreviewResult(
            available = false,
            normalized = normalized,
            translation = "",
            matchedBy = "none",
            note = "No local preview translation available for this phrase yet."
        )
    }
}
