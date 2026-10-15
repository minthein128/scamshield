package com.saferoute.shield

import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject

enum class CompanionState { IDLE, CHECKING, WARNING, CONNECTING, LISTENING, THINKING, SPEAKING, RECHECKING, ENDED }

enum class EndReason { USER, CAP, SHIELD, ERROR, SERVER }

data class CompanionView(
    val state: CompanionState = CompanionState.IDLE,
    val muted: Boolean = false,
    /** Another app or a call took audio focus. */
    val paused: Boolean = false,
    /** Latest model line (cumulative), or the warning text while it plays. */
    val caption: String = "",
    val endedBy: EndReason? = null,
    /** Error code: a /v1/live code, or mic_denied, needs_foreground, audio, check_failed. */
    val error: String? = null,
    /** Set when the mic gives pure silence, which is what Android does when voice is blocked in the background. */
    val micBlocked: Boolean = false,
) {
    val live: Boolean get() = state == CompanionState.LISTENING || state == CompanionState.THINKING || state == CompanionState.SPEAKING
}

/** What the session needs from the shield service. Every callback must arrive on the main thread. */
interface CompanionHost {
    /** Captures the screen, runs /v1/check and shows the verdict on the bubble. Calls back with the result or an error message. */
    fun runCheck(onDone: (JSONObject?, String?) -> Unit)
    /** Fetches the approved warning through /v1/speak. Calls back with WAV bytes, or null. */
    fun fetchWarning(text: String, onDone: (ByteArray?) -> Unit)
    fun openSocket(listener: CompanionSocketListener): CompanionSocket
    /** language, home, destination and token for the start frame. */
    fun startFields(): JSONObject
    /** HOTLINES or WARN_FAMILY from the model. */
    fun onAction(screen: String)
}

/**
 * One voice companion session over the bubble: fresh check, approved warning, then /v1/live in
 * companion mode. Main thread only, except the capture callback, which only reads volatile flags.
 */
class CompanionSession(
    private val host: CompanionHost,
    private val audio: CompanionAudio,
    private val onChange: (CompanionView) -> Unit,
    private val main: Handler = Handler(Looper.getMainLooper()),
) : CompanionSocketListener {

    var view = CompanionView()
        private set
    val isActive: Boolean get() = view.state != CompanionState.IDLE && view.state != CompanionState.ENDED

    private var report: JSONObject? = null
    private var socket: CompanionSocket? = null
    private var capturing = false
    @Volatile private var micOpen = false
    @Volatile private var heardSound = false
    @Volatile private var silentChunks = 0
    private var playUntil = 0L

    private val capTimer = Runnable { end(EndReason.CAP) }
    private val connectTimer = Runnable { end(EndReason.ERROR, "unavailable") }
    private val settleTimer = Runnable { if (view.state == CompanionState.SPEAKING) set(view.copy(state = CompanionState.LISTENING)) }
    private val thinkTimer = Runnable { if (view.state == CompanionState.THINKING) set(view.copy(state = CompanionState.LISTENING)) }
    private var afterWarning: (() -> Unit)? = null
    private val warningTimer = Runnable {
        val next = afterWarning
        afterWarning = null
        next?.invoke()
    }

    private val onChunk: (String) -> Unit = { b64 ->
        if (micOpen) socket?.send("{\"type\":\"audio\",\"data\":\"$b64\"}")
        if (!heardSound) {
            if (hasSignal(b64)) {
                heardSound = true
            } else if (++silentChunks == SILENT_CHUNKS) {
                main.post { if (!heardSound && isActive) set(view.copy(micBlocked = true)) }
            }
        }
    }

    /** Starts from the result on the bubble, or from a fresh check when [existing] is null. */
    fun start(existing: JSONObject?) {
        if (isActive) return
        if (existing != null) {
            report = existing
            playWarning(existing) { openLive() }
            return
        }
        set(CompanionView(state = CompanionState.CHECKING))
        host.runCheck { json, _ ->
            if (!isActive) return@runCheck
            if (json == null) {
                end(EndReason.ERROR, "check_failed")
                return@runCheck
            }
            report = json
            playWarning(json) { openLive() }
        }
    }

    /** Tap on the bubble: mute or unmute. Also resumes after a lost audio focus. */
    fun toggleMute() {
        if (!view.live) return
        if (view.paused) {
            set(view.copy(paused = false, muted = false))
        } else {
            set(view.copy(muted = !view.muted))
        }
        syncMic()
    }

    fun onFocus(event: FocusEvent) {
        if (!isActive) return
        when (event) {
            FocusEvent.LOST, FocusEvent.LOST_TRANSIENT -> {
                audio.flush()
                playUntil = 0
                set(view.copy(paused = true, state = if (view.state == CompanionState.SPEAKING) CompanionState.LISTENING else view.state))
                syncMic()
            }
            FocusEvent.GAINED -> if (view.paused) {
                set(view.copy(paused = false))
                syncMic()
            }
        }
    }

    fun end(reason: EndReason, error: String? = null) {
        if (!isActive) return
        listOf(capTimer, connectTimer, settleTimer, thinkTimer, warningTimer).forEach(main::removeCallbacks)
        afterWarning = null
        micOpen = false
        capturing = false
        val s = socket
        socket = null
        if (s != null) {
            s.send("{\"type\":\"end\"}")
            s.close()
        }
        audio.release()
        set(view.copy(state = CompanionState.ENDED, endedBy = reason, error = error, muted = false, paused = false))
    }

    // ---- warning, socket, recheck ----

    private fun playWarning(result: JSONObject, then: () -> Unit) {
        val text = result.optString("spokenWarning").ifBlank { result.optString("summary") }
        set(view.copy(state = CompanionState.WARNING, caption = text))
        if (text.isBlank()) {
            then()
            return
        }
        host.fetchWarning(text) { wav ->
            if (!isActive) return@fetchWarning
            val pcm = wav?.let(WavPcm::toPcm24k)
            afterWarning = then
            if (pcm == null || pcm.isEmpty()) {
                main.post(warningTimer)
                return@fetchWarning
            }
            audio.play(pcm)
            main.postDelayed(warningTimer, WavPcm.durationMs(pcm) + WARNING_TAIL_MS)
        }
    }

    private fun openLive() {
        set(view.copy(state = CompanionState.CONNECTING, caption = ""))
        main.postDelayed(connectTimer, CONNECT_TIMEOUT_MS)
        socket = try {
            host.openSocket(this)
        } catch (e: Exception) {
            null
        }
        if (socket == null) end(EndReason.ERROR, "unavailable")
    }

    override fun onOpen() {
        val r = report ?: return end(EndReason.ERROR, "not_found")
        val start = host.startFields()
            .put("type", "start")
            .put("mode", "companion")
            .put("report", reportPayload(r))
        r.optString("id").takeIf { it.isNotBlank() && it.length <= 64 }?.let { start.put("checkId", it) }
        socket?.send(start.toString())
    }

    override fun onClosed(failed: Boolean) {
        if (!isActive) return
        if (view.state == CompanionState.CONNECTING) end(EndReason.ERROR, "unavailable") else end(EndReason.SERVER)
    }

    override fun onText(text: String) {
        if (!isActive) return
        val f = try {
            JSONObject(text)
        } catch (e: Exception) {
            return
        }
        when (f.optString("type")) {
            "ready" -> {
                main.removeCallbacks(connectTimer)
                val maxMs = f.optLong("maxMs", DEFAULT_CAP_MS).takeIf { it > 0 } ?: DEFAULT_CAP_MS
                main.postDelayed(capTimer, maxMs)
                set(view.copy(state = CompanionState.LISTENING))
                syncMic()
            }
            "audio" -> onModelAudio(f.optString("data"))
            "interrupted" -> {
                audio.flush()
                playUntil = 0
                main.removeCallbacks(settleTimer)
                if (view.state == CompanionState.SPEAKING) set(view.copy(state = CompanionState.LISTENING))
            }
            "transcript" -> {
                val line = f.optString("text")
                if (f.optString("role") == "model") {
                    if (line.isNotBlank() && view.state != CompanionState.WARNING) set(view.copy(caption = line))
                } else if (view.state == CompanionState.LISTENING && line.isNotBlank()) {
                    set(view.copy(state = CompanionState.THINKING))
                    main.removeCallbacks(thinkTimer)
                    main.postDelayed(thinkTimer, THINK_TIMEOUT_MS)
                }
            }
            "action" -> when (val screen = f.optString("screen")) {
                "RECHECK" -> recheck()
                "HOTLINES", "WARN_FAMILY" -> host.onAction(screen)
            }
            "error" -> end(EndReason.ERROR, f.optString("code").ifBlank { "upstream" })
            "closed" -> end(if (f.optString("reason") == "cap") EndReason.CAP else EndReason.SERVER)
        }
    }

    private fun onModelAudio(b64: String) {
        if (b64.isEmpty() || view.state == CompanionState.WARNING || view.state == CompanionState.CONNECTING) return
        val pcm = try {
            Base64.decode(b64, Base64.DEFAULT)
        } catch (e: IllegalArgumentException) {
            return
        }
        if (view.paused) return
        audio.play(pcm)
        val now = SystemClock.uptimeMillis()
        playUntil = maxOf(playUntil, now) + WavPcm.durationMs(pcm)
        main.removeCallbacks(settleTimer)
        main.postDelayed(settleTimer, playUntil - now + SETTLE_MS)
        if (view.state != CompanionState.RECHECKING && view.state != CompanionState.SPEAKING) {
            main.removeCallbacks(thinkTimer)
            set(view.copy(state = CompanionState.SPEAKING))
        }
    }

    private fun recheck() {
        if (!view.live) return
        main.removeCallbacks(settleTimer)
        main.removeCallbacks(thinkTimer)
        set(view.copy(state = CompanionState.RECHECKING, caption = ""))
        syncMic()
        host.runCheck { json, _ ->
            if (!isActive) return@runCheck
            if (json == null) {
                socket?.send(JSONObject().put("type", "context").put("error", "check_failed").toString())
                resumeAfterRecheck()
                return@runCheck
            }
            report = json
            playWarning(json) {
                val frame = JSONObject().put("type", "context").put("report", reportPayload(json))
                json.optString("id").takeIf { it.isNotBlank() && it.length <= 64 }?.let { frame.put("checkId", it) }
                socket?.send(frame.toString())
                resumeAfterRecheck()
            }
        }
    }

    private fun resumeAfterRecheck() {
        set(view.copy(state = CompanionState.THINKING, caption = ""))
        main.removeCallbacks(thinkTimer)
        main.postDelayed(thinkTimer, THINK_TIMEOUT_MS)
        syncMic()
    }

    /** Opens the mic in live states unless muted or paused; closes it otherwise. */
    private fun syncMic() {
        val wantCapture = view.live && !view.muted && !view.paused
        if (wantCapture && !capturing) {
            if (!audio.startCapture(onChunk)) {
                end(EndReason.ERROR, "audio")
                return
            }
            capturing = true
        } else if (!wantCapture && capturing && (view.muted || view.paused || !isActive)) {
            audio.stopCapture()
            capturing = false
        }
        micOpen = capturing && view.live
    }

    private fun set(next: CompanionView) {
        view = next
        onChange(next)
    }

    companion object {
        const val DEFAULT_CAP_MS = 300_000L
        const val CONNECT_TIMEOUT_MS = 10_000L
        const val THINK_TIMEOUT_MS = 8_000L
        const val SETTLE_MS = 200L
        const val WARNING_TAIL_MS = 300L
        /** 4 s of 100 ms chunks. */
        const val SILENT_CHUNKS = 40

        private fun hasSignal(b64: String): Boolean = try {
            Base64.decode(b64, Base64.DEFAULT).any { it.toInt() != 0 }
        } catch (e: IllegalArgumentException) {
            true
        }

        /** The report fields /v1/live accepts, capped to its limits. */
        fun reportPayload(r: JSONObject): JSONObject {
            val out = JSONObject()
                .put("verdict", r.optString("verdict").takeIf { it in VERDICTS } ?: "careful")
                .put("score", r.optDouble("score", 50.0).coerceIn(0.0, 100.0))
                .put("title", r.optString("title").take(300))
                .put("summary", r.optString("summary").take(2000))
                .put("scamType", r.optString("scamType").takeIf { it in SCAM_TYPES } ?: "other")
            val flags = JSONArray()
            val src = r.optJSONArray("flags") ?: JSONArray()
            for (i in 0 until minOf(20, src.length())) {
                val f = src.optJSONObject(i) ?: continue
                val family = f.optString("family")
                if (family !in FAMILIES) continue
                flags.put(
                    JSONObject()
                        .put("family", family)
                        .put("label", f.optString("label").take(300))
                        .put("evidence", f.optString("evidence").take(600))
                        .put("severity", f.optString("severity").takeIf { it in SEVERITIES } ?: "low")
                )
            }
            out.put("flags", flags)
            val sources = JSONArray()
            val srcs = r.optJSONArray("sources") ?: JSONArray()
            for (i in 0 until minOf(10, srcs.length())) {
                val s = srcs.optJSONObject(i) ?: continue
                sources.put(JSONObject().put("title", s.optString("title").take(200)).put("url", s.optString("url").take(500)))
            }
            out.put("sources", sources)
            r.optJSONObject("network")?.optInt("seenCount", -1)?.takeIf { it >= 0 }?.let {
                out.put("network", JSONObject().put("seenCount", it))
            }
            return out
        }

        private val VERDICTS = setOf("safe", "careful", "danger")
        private val SEVERITIES = setOf("low", "medium", "high")
        private val FAMILIES = setOf("too_good", "pressure", "payment_route", "identity", "link_risk", "known_bad", "trafficking")
        private val SCAM_TYPES = setOf(
            "job_trafficking", "romance_pig_butchering", "parcel_phishing", "fake_agency",
            "marketplace_fraud", "investment", "other", "none",
        )
    }
}
