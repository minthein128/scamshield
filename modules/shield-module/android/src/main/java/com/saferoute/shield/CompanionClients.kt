package com.saferoute.shield

import android.os.Handler
import android.os.Looper
import android.util.Base64
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.TimeUnit

/** WAV (16-bit PCM) to 24 kHz mono 16-bit little-endian PCM, the format the playback engine takes. */
object WavPcm {
    const val RATE = 24_000

    fun toPcm24k(wav: ByteArray): ByteArray? {
        if (wav.size < 12 || String(wav, 0, 4, Charsets.US_ASCII) != "RIFF" || String(wav, 8, 4, Charsets.US_ASCII) != "WAVE") return null
        val buf = ByteBuffer.wrap(wav).order(ByteOrder.LITTLE_ENDIAN)
        var off = 12
        var rate = RATE
        var channels = 1
        var bits = 16
        var data: ByteArray? = null
        while (off + 8 <= wav.size) {
            val id = String(wav, off, 4, Charsets.US_ASCII)
            val size = buf.getInt(off + 4)
            if (size < 0) return null
            val start = off + 8
            val end = minOf(wav.size, start + size)
            if (id == "fmt " && end - start >= 16) {
                channels = buf.getShort(start + 2).toInt()
                rate = buf.getInt(start + 4)
                bits = buf.getShort(start + 14).toInt()
            } else if (id == "data") {
                data = wav.copyOfRange(start, end)
            }
            off = start + size + (size and 1)
        }
        val raw = data ?: return null
        if (bits != 16 || channels < 1 || rate <= 0) return null
        val frames = raw.size / (2 * channels)
        val mono = ShortArray(frames)
        val src = ByteBuffer.wrap(raw).order(ByteOrder.LITTLE_ENDIAN)
        for (i in 0 until frames) {
            var sum = 0
            for (c in 0 until channels) sum += src.getShort((i * channels + c) * 2).toInt()
            mono[i] = (sum / channels).toShort()
        }
        val out = if (rate == RATE) mono else resample(mono, rate)
        val bytes = ByteBuffer.allocate(out.size * 2).order(ByteOrder.LITTLE_ENDIAN)
        for (s in out) bytes.putShort(s)
        return bytes.array()
    }

    fun durationMs(pcm24k: ByteArray): Long = pcm24k.size / 2 * 1000L / RATE

    private fun resample(src: ShortArray, rate: Int): ShortArray {
        val n = (src.size.toLong() * RATE / rate).toInt()
        val out = ShortArray(n)
        for (i in 0 until n) {
            val pos = i.toDouble() * rate / RATE
            val i0 = pos.toInt()
            val f = pos - i0
            val a = src.getOrElse(i0) { 0 }.toDouble()
            val b = src.getOrElse(i0 + 1) { src.getOrElse(i0) { 0 } }.toDouble()
            out[i] = (a * (1 - f) + b * f).toInt().toShort()
        }
        return out
    }
}

/** POST /v1/speak: the approved spoken warning as WAV bytes. */
object SpeakClient {
    private const val MAX_TEXT = 600

    fun speak(apiUrl: String, text: String, language: String, authToken: String = ""): ByteArray? {
        if (apiUrl.isBlank() || text.isBlank()) return null
        val body = JSONObject().put("text", text.take(MAX_TEXT)).put("language", language).toString().toByteArray(Charsets.UTF_8)
        val connection = try {
            URL(apiUrl.trim().trimEnd('/') + "/v1/speak").openConnection() as HttpURLConnection
        } catch (e: IOException) {
            return null
        }
        return try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 10_000
            connection.readTimeout = 30_000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            if (authToken.isNotBlank()) connection.setRequestProperty("Authorization", "Bearer $authToken")
            connection.setFixedLengthStreamingMode(body.size)
            connection.outputStream.use { it.write(body) }
            if (connection.responseCode !in 200..299) return null
            val reply = connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            val audio = JSONObject(reply).optString("audioBase64")
            if (audio.isBlank()) null else Base64.decode(audio, Base64.DEFAULT)
        } catch (e: Exception) {
            null
        } finally {
            connection.disconnect()
        }
    }
}

interface CompanionSocket {
    fun send(text: String): Boolean
    fun close()
}

/** Socket events, always delivered on the main thread. */
interface CompanionSocketListener {
    fun onOpen()
    fun onText(text: String)
    fun onClosed(failed: Boolean)
}

/** /v1/live over OkHttp. Callbacks hop to the main thread; send() is safe from any thread. */
class OkHttpCompanionSocket(url: String, listener: CompanionSocketListener) : CompanionSocket {
    private val main = Handler(Looper.getMainLooper())
    @Volatile private var closed = false
    private val socket: WebSocket = client.newWebSocket(Request.Builder().url(url).build(), object : WebSocketListener() {
        override fun onOpen(webSocket: WebSocket, response: Response) {
            main.post { if (!closed) listener.onOpen() }
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            main.post { if (!closed) listener.onText(text) }
        }

        override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
            webSocket.close(1000, null)
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            main.post { if (!closed) listener.onClosed(false) }
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            main.post { if (!closed) listener.onClosed(true) }
        }
    })

    override fun send(text: String): Boolean = !closed && socket.send(text)

    override fun close() {
        closed = true
        socket.close(1000, null)
    }

    companion object {
        private val client by lazy {
            OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .pingInterval(20, TimeUnit.SECONDS)
                .build()
        }

        fun liveUrl(apiUrl: String): String =
            apiUrl.trim().trimEnd('/').replaceFirst(Regex("^http", RegexOption.IGNORE_CASE), "ws") + "/v1/live"
    }
}
