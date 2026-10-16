package com.saferoute.shield

import android.util.Base64
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

class CheckException(message: String, val kind: String = "unknown") : Exception(message)

object CheckClient {
    private const val CONNECT_TIMEOUT_MS = 10_000
    private const val READ_TIMEOUT_MS = 60_000

    /** The /v1/check body. Scam-pattern sharing is opt-in, so shareSignals is always sent and false unless chosen. */
    fun requestBody(language: String, jpeg: ByteArray, shareSignals: Boolean = false): JSONObject = JSONObject()
        .put("kind", "screen")
        .put("imageBase64", Base64.encodeToString(jpeg, Base64.NO_WRAP))
        .put("imageMimeType", "image/jpeg")
        .put("language", language)
        .put("shareSignals", shareSignals)

    fun checkScreen(apiUrl: String, language: String, jpeg: ByteArray, authToken: String = "", shareSignals: Boolean = false): JSONObject {
        if (apiUrl.isBlank()) throw CheckException("Shield has no server address.")
        val body = requestBody(language, jpeg, shareSignals).toString().toByteArray(Charsets.UTF_8)

        val connection = try {
            URL(apiUrl.trim().trimEnd('/') + "/v1/check").openConnection() as HttpURLConnection
        } catch (e: IOException) {
            throw CheckException("Shield server address is not valid.")
        }
        try {
            connection.requestMethod = "POST"
            connection.connectTimeout = CONNECT_TIMEOUT_MS
            connection.readTimeout = READ_TIMEOUT_MS
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")
            if (authToken.isNotBlank()) connection.setRequestProperty("Authorization", "Bearer $authToken")
            connection.setFixedLengthStreamingMode(body.size)
            connection.outputStream.use { it.write(body) }

            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            if (code in 200..299) {
                val json = try {
                    JSONObject(text)
                } catch (e: Exception) {
                    throw CheckException("The server sent an answer we cannot read.")
                }
                if (!json.has("verdict")) throw CheckException("The server sent an answer we cannot read.")
                return json
            }
            throw CheckException(errorMessage(code, text))
        } catch (e: CheckException) {
            throw e
        } catch (e: IOException) {
            throw CheckException("No connection. Check your internet and try again.")
        } finally {
            connection.disconnect()
        }
    }

    private fun errorMessage(code: Int, text: String): String {
        val serverMessage = try {
            JSONObject(text).optJSONObject("error")?.optString("message").orEmpty()
        } catch (e: Exception) {
            ""
        }
        return when {
            code == 429 -> "Too many checks. Wait a minute and try again."
            code == 413 -> "The screenshot is too large to check."
            code in 400..499 -> serverMessage.ifBlank { "The check was rejected ($code)." }.take(120)
            else -> "The check service is busy ($code). Try again soon."
        }
    }
}
