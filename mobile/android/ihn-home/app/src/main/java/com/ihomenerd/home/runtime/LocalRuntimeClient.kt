package com.ihomenerd.home.runtime

import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

data class PronuncoCompareResult(
    val expectedNormalized: String,
    val actualNormalized: String,
    val expectedSyllables: List<String>,
    val actualSyllables: List<String>,
    val toneMismatches: Int,
    val syllableDistance: Int,
    val similarity: Double
)

data class LocalPackRecord(
    val id: String,
    val name: String,
    val kind: String,
    val loaded: Boolean,
    val loadable: Boolean,
    val capabilities: List<String>,
    val note: String
)

data class TranslatePreviewResponse(
    val available: Boolean,
    val normalized: String,
    val translation: String,
    val matchedBy: String,
    val note: String
)

object LocalRuntimeClient {
    fun loopbackBaseUrl(): String = "http://127.0.0.1:${LocalNodeRuntime.SETUP_PORT}"

    fun comparePinyin(expected: String, actual: String): PronuncoCompareResult {
        val url = buildString {
            append(loopbackBaseUrl())
            append("/v1/pronunco/compare-pinyin?expected=")
            append(URLEncoder.encode(expected, StandardCharsets.UTF_8.name()))
            append("&actual=")
            append(URLEncoder.encode(actual, StandardCharsets.UTF_8.name()))
        }
        val json = fetchJson(url)
        return PronuncoCompareResult(
            expectedNormalized = json.optString("expectedNormalized"),
            actualNormalized = json.optString("actualNormalized"),
            expectedSyllables = json.optStringList("expectedSyllables"),
            actualSyllables = json.optStringList("actualSyllables"),
            toneMismatches = json.optInt("toneMismatches"),
            syllableDistance = json.optInt("syllableDistance"),
            similarity = json.optDouble("similarity")
        )
    }

    fun loadPack(id: String): List<LocalPackRecord> {
        val json = postJson(
            "${loopbackBaseUrl()}/v1/mobile/model-packs/load",
            JSONObject().put("id", id)
        )
        return json.optObjectList("packs", ::parsePack)
    }

    fun unloadPack(id: String): List<LocalPackRecord> {
        val json = postJson(
            "${loopbackBaseUrl()}/v1/mobile/model-packs/unload",
            JSONObject().put("id", id)
        )
        return json.optObjectList("packs", ::parsePack)
    }

    fun translatePreview(text: String): TranslatePreviewResponse {
        val json = fetchJson(
            buildString {
                append(loopbackBaseUrl())
                append("/v1/translate-small/preview?text=")
                append(URLEncoder.encode(text, StandardCharsets.UTF_8.name()))
            }
        )
        return TranslatePreviewResponse(
            available = json.optBoolean("available", false),
            normalized = json.optString("normalized"),
            translation = json.optString("translation"),
            matchedBy = json.optString("matchedBy"),
            note = json.optString("note")
        )
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
            val body = BufferedReader(InputStreamReader(stream)).use { it.readText() }
            if (code !in 200..299) {
                throw IllegalStateException("HTTP $code from $url")
            }
            JSONObject(body)
        } finally {
            conn.disconnect()
        }
    }

    private fun postJson(url: String, body: JSONObject): JSONObject {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 3000
            readTimeout = 5000
            requestMethod = "POST"
            doOutput = true
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Content-Type", "application/json")
        }

        return try {
            conn.outputStream.use { output ->
                output.write(body.toString().toByteArray(StandardCharsets.UTF_8))
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val responseBody = BufferedReader(InputStreamReader(stream)).use { it.readText() }
            if (code !in 200..299) {
                throw IllegalStateException("HTTP $code from $url")
            }
            JSONObject(responseBody)
        } finally {
            conn.disconnect()
        }
    }

    private fun parsePack(json: JSONObject): LocalPackRecord {
        return LocalPackRecord(
            id = json.optString("id"),
            name = json.optString("name"),
            kind = json.optString("kind"),
            loaded = json.optBoolean("loaded", false),
            loadable = json.optBoolean("loadable", false),
            capabilities = json.optStringList("capabilities"),
            note = json.optString("note")
        )
    }

    private fun JSONObject.optStringList(key: String): List<String> {
        val array = optJSONArray(key) ?: return emptyList()
        return buildList {
            for (index in 0 until array.length()) {
                val value = array.optString(index)
                if (value.isNotBlank()) add(value)
            }
        }
    }

    private fun <T> JSONObject.optObjectList(key: String, parse: (JSONObject) -> T): List<T> {
        val array = optJSONArray(key) ?: return emptyList()
        return buildList {
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                add(parse(item))
            }
        }
    }
}
