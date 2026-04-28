package com.ihomenerd.home.runtime

import kotlin.math.max

data class PinyinComparison(
    val expectedNormalized: String,
    val actualNormalized: String,
    val expectedSyllables: List<String>,
    val actualSyllables: List<String>,
    val toneMismatches: Int,
    val syllableDistance: Int,
    val similarity: Double
)

object PronuncoPinyinTools {
    private val toneMap = mapOf(
        'ā' to "a1", 'á' to "a2", 'ǎ' to "a3", 'à' to "a4",
        'ē' to "e1", 'é' to "e2", 'ě' to "e3", 'è' to "e4",
        'ī' to "i1", 'í' to "i2", 'ǐ' to "i3", 'ì' to "i4",
        'ō' to "o1", 'ó' to "o2", 'ǒ' to "o3", 'ò' to "o4",
        'ū' to "u1", 'ú' to "u2", 'ǔ' to "u3", 'ù' to "u4",
        'ǖ' to "v1", 'ǘ' to "v2", 'ǚ' to "v3", 'ǜ' to "v4",
        'ü' to "v5", 'ê' to "e5"
    )

    fun normalize(input: String): String {
        val lowered = input.trim().lowercase()
        val out = StringBuilder()
        for (char in lowered) {
            val replacement = toneMap[char]
            when {
                replacement != null -> out.append(replacement)
                char.isLetterOrDigit() || char == '\'' || char == ' ' -> out.append(char)
                else -> out.append(' ')
            }
        }
        return out.toString()
            .replace(Regex("\\s+"), " ")
            .trim()
    }

    fun syllables(input: String): List<String> {
        return normalize(input)
            .split(' ')
            .map { it.trim('\'') }
            .filter { it.isNotBlank() }
    }

    fun compare(expected: String, actual: String): PinyinComparison {
        val expectedNormalized = normalize(expected)
        val actualNormalized = normalize(actual)
        val expectedSyllables = syllables(expected)
        val actualSyllables = syllables(actual)
        val toneMismatches = countToneMismatches(expectedSyllables, actualSyllables)
        val syllableDistance = levenshtein(expectedSyllables, actualSyllables)
        val maxLen = max(expectedSyllables.size, actualSyllables.size).coerceAtLeast(1)
        val similarity = (1.0 - syllableDistance.toDouble() / maxLen.toDouble()).coerceIn(0.0, 1.0)
        return PinyinComparison(
            expectedNormalized = expectedNormalized,
            actualNormalized = actualNormalized,
            expectedSyllables = expectedSyllables,
            actualSyllables = actualSyllables,
            toneMismatches = toneMismatches,
            syllableDistance = syllableDistance,
            similarity = similarity
        )
    }

    private fun countToneMismatches(expected: List<String>, actual: List<String>): Int {
        val pairs = minOf(expected.size, actual.size)
        var mismatches = 0
        repeat(pairs) { index ->
            if (toneOf(expected[index]) != toneOf(actual[index])) {
                mismatches += 1
            }
        }
        return mismatches
    }

    private fun toneOf(syllable: String): Char {
        return syllable.lastOrNull()?.takeIf { it in '1'..'5' } ?: '5'
    }

    private fun levenshtein(left: List<String>, right: List<String>): Int {
        if (left.isEmpty()) return right.size
        if (right.isEmpty()) return left.size

        val dp = Array(left.size + 1) { IntArray(right.size + 1) }
        for (i in left.indices) dp[i + 1][0] = i + 1
        for (j in right.indices) dp[0][j + 1] = j + 1

        for (i in left.indices) {
            for (j in right.indices) {
                val cost = if (left[i] == right[j]) 0 else 1
                dp[i + 1][j + 1] = minOf(
                    dp[i][j + 1] + 1,
                    dp[i + 1][j] + 1,
                    dp[i][j] + cost
                )
            }
        }
        return dp[left.size][right.size]
    }
}
