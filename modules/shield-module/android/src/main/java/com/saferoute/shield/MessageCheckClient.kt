package com.saferoute.shield

import org.json.JSONObject
import java.io.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.net.HttpURLConnection
import java.net.URL

/** POST /v1/check with kind "message". Sends only the redacted text. */
object MessageCheckClient {
    private const val CONNECT_TIMEOUT_MS = 10_000
    private const val READ_TIMEOUT_MS = 30_000

    /** shareSignals is sent only after the user opted in; the server reads a missing value as false. */
    internal fun body(text: String, language: String, shareSignals: Boolean): ByteArray =
        JSONObject()
            .put("kind", "message")
            .put("text", text)
            .put("language", language)
            .apply { if (shareSignals) put("shareSignals", true) }
            .toString()
            .toByteArray(Charsets.UTF_8)

    internal fun failureKind(e: IOException): String = when (e) {
        is SocketTimeoutException -> "timeout"
        is UnknownHostException -> "no_connection"
        is ConnectException -> "no_connection"
        else -> "network"
    }

    fun check(apiUrl: String, language: String, text: String, shareSignals: Boolean, authToken: String): JSONObject {
        if (apiUrl.isBlank()) throw CheckException("Message Guard has no server address.", "no_server")
        val payload = body(text, language, shareSignals)
        val connection = try {
            URL(apiUrl.trim().trimEnd('/') + "/v1/check").openConnection() as HttpURLConnection
        } catch (e: IOException) {
            throw CheckException("Server address is not valid.", "bad_url")
        }
        try {
            connection.requestMethod = "POST"
            connection.connectTimeout = CONNECT_TIMEOUT_MS
            connection.readTimeout = READ_TIMEOUT_MS
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")
            if (authToken.isNotBlank()) connection.setRequestProperty("Authorization", "Bearer $authToken")
            connection.setFixedLengthStreamingMode(payload.size)
            connection.outputStream.use { it.write(payload) }
            val code = connection.responseCode
            if (code !in 200..299) throw CheckException("The check failed ($code).", "server_$code")
            val text2 = connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            val json = try {
                JSONObject(text2)
            } catch (e: Exception) {
                throw CheckException("Unreadable answer.", "unreadable")
            }
            if (!json.has("verdict")) throw CheckException("Unreadable answer.", "unreadable")
            return json
        } catch (e: CheckException) {
            throw e
        } catch (e: IOException) {
            throw CheckException("No connection.", failureKind(e))
        } finally {
            connection.disconnect()
        }
    }
}
