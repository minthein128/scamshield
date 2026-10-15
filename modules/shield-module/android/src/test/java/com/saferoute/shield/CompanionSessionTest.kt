package com.saferoute.shield

import android.os.Handler
import android.os.Looper
import android.util.Base64
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowLooper
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class CompanionSessionTest {

    private class FakeSocket : CompanionSocket {
        val sent = ArrayList<JSONObject>()
        var closed = false
        override fun send(text: String): Boolean {
            sent += JSONObject(text)
            return true
        }
        override fun close() { closed = true }
        fun ofType(type: String) = sent.filter { it.optString("type") == type }
    }

    private class FakeAudio : CompanionAudio {
        var onChunk: ((String) -> Unit)? = null
        var captureStarts = 0
        var captureStops = 0
        var played = 0
        var flushes = 0
        var released = false
        var micWorks = true
        override fun startCapture(onChunk: (String) -> Unit): Boolean {
            if (!micWorks) return false
            this.onChunk = onChunk
            captureStarts++
            return true
        }
        override fun stopCapture() {
            captureStops++
            onChunk = null
        }
        override fun play(pcm24k: ByteArray) { played += pcm24k.size }
        override fun flush() { flushes++ }
        override fun inputLevel() = 0f
        override fun outputLevel() = 0f
        override fun release() { released = true }
    }

    private inner class FakeHost : CompanionHost {
        val checks = ArrayList<(JSONObject?, String?) -> Unit>()
        val warnings = ArrayList<String>()
        val actions = ArrayList<String>()
        var socket: FakeSocket? = null
        var listener: CompanionSocketListener? = null
        var warningWav: ByteArray? = wav(500)
        override fun runCheck(onDone: (JSONObject?, String?) -> Unit) { checks += onDone }
        override fun fetchWarning(text: String, onDone: (ByteArray?) -> Unit) {
            warnings += text
            onDone(warningWav)
        }
        override fun openSocket(listener: CompanionSocketListener): CompanionSocket {
            this.listener = listener
            return FakeSocket().also { socket = it }
        }
        override fun startFields(): JSONObject = JSONObject().put("language", "my").put("home", "MM").put("destination", "TH").put("token", "tok")
        override fun onAction(screen: String) { actions += screen }
    }

    private lateinit var host: FakeHost
    private lateinit var audio: FakeAudio
    private lateinit var session: CompanionSession
    private val states = ArrayList<CompanionState>()

    @Before
    fun setUp() {
        host = FakeHost()
        audio = FakeAudio()
        states.clear()
        session = CompanionSession(host, audio, { v -> if (states.lastOrNull() != v.state) states += v.state }, Handler(Looper.getMainLooper()))
    }

    private fun advance(ms: Long) = ShadowLooper.idleMainLooper(ms, TimeUnit.MILLISECONDS)

    private fun report(verdict: String, id: String = "chk_$verdict") = JSONObject(
        """{"id":"$id","verdict":"$verdict","score":81,"title":"Job offer","summary":"Asks for a fee first.",
        "spokenWarning":"Please do not pay yet.","scamType":"job_trafficking",
        "flags":[{"family":"payment_route","label":"Fee first","evidence":"Pay 300 USD","severity":"high"},
                 {"family":"made_up","label":"x","severity":"low"}]}"""
    )

    private fun wav(ms: Int, rate: Int = 24_000, channels: Int = 1, fill: Short = 1000): ByteArray {
        val frames = rate * ms / 1000
        val data = frames * channels * 2
        val b = ByteBuffer.allocate(44 + data).order(ByteOrder.LITTLE_ENDIAN)
        b.put("RIFF".toByteArray()).putInt(36 + data).put("WAVE".toByteArray())
        b.put("fmt ".toByteArray()).putInt(16).putShort(1).putShort(channels.toShort()).putInt(rate)
            .putInt(rate * channels * 2).putShort((channels * 2).toShort()).putShort(16)
        b.put("data".toByteArray()).putInt(data)
        repeat(frames * channels) { b.putShort(fill) }
        return b.array()
    }

    private fun frame(json: String) = host.listener!!.onText(json)

    private fun pcmB64(ms: Int, value: Short = 500): String {
        val b = ByteBuffer.allocate(24 * ms * 2).order(ByteOrder.LITTLE_ENDIAN)
        repeat(24 * ms) { b.putShort(value) }
        return Base64.encodeToString(b.array(), Base64.NO_WRAP)
    }

    private fun toListening(existing: JSONObject? = report("danger"), maxMs: Long = 300_000) {
        session.start(existing)
        advance(900)
        host.listener!!.onOpen()
        frame("""{"type":"ready","maxMs":$maxMs}""")
    }

    @Test
    fun idleCheckWarningListeningSpeakingEnded() {
        assertEquals(CompanionState.IDLE, session.view.state)
        session.start(null)
        assertEquals(CompanionState.CHECKING, session.view.state)
        assertEquals(1, host.checks.size)

        host.checks[0](report("danger"), null)
        assertEquals(CompanionState.WARNING, session.view.state)
        assertEquals(listOf("Please do not pay yet."), host.warnings)
        assertEquals("Please do not pay yet.", session.view.caption)
        assertTrue(audio.played > 0)
        assertNull(host.socket)

        advance(900)
        assertEquals(CompanionState.CONNECTING, session.view.state)
        host.listener!!.onOpen()
        val start = host.socket!!.ofType("start").single()
        assertEquals("companion", start.getString("mode"))
        assertEquals("chk_danger", start.getString("checkId"))
        assertEquals("my", start.getString("language"))
        assertEquals("MM", start.getString("home"))
        assertEquals("TH", start.getString("destination"))
        assertEquals("tok", start.getString("token"))
        val sentReport = start.getJSONObject("report")
        assertEquals("danger", sentReport.getString("verdict"))
        assertEquals(1, sentReport.getJSONArray("flags").length())
        assertFalse(sentReport.has("spokenWarning"))

        frame("""{"type":"ready","maxMs":300000}""")
        assertEquals(CompanionState.LISTENING, session.view.state)
        assertEquals(1, audio.captureStarts)
        audio.onChunk!!(pcmB64(100))
        assertEquals(1, host.socket!!.ofType("audio").size)

        frame("""{"type":"transcript","role":"user","text":"Is it safe?"}""")
        assertEquals(CompanionState.THINKING, session.view.state)
        frame("""{"type":"audio","data":"${pcmB64(300)}"}""")
        assertEquals(CompanionState.SPEAKING, session.view.state)
        frame("""{"type":"transcript","role":"model","text":"It looks risky."}""")
        frame("""{"type":"transcript","role":"model","text":"It looks risky. Please wait."}""")
        assertEquals("It looks risky. Please wait.", session.view.caption)
        advance(600)
        assertEquals(CompanionState.LISTENING, session.view.state)

        session.end(EndReason.USER)
        assertEquals(CompanionState.ENDED, session.view.state)
        assertEquals(EndReason.USER, session.view.endedBy)
        assertEquals(1, host.socket!!.ofType("end").size)
        assertTrue(host.socket!!.closed)
        assertTrue(audio.released)
        assertEquals(
            listOf(
                CompanionState.CHECKING, CompanionState.WARNING, CompanionState.CONNECTING, CompanionState.LISTENING,
                CompanionState.THINKING, CompanionState.SPEAKING, CompanionState.LISTENING, CompanionState.ENDED,
            ),
            states
        )
    }

    @Test
    fun reusesTheResultOnShowWithoutANewCheck() {
        session.start(report("careful"))
        assertEquals(CompanionState.WARNING, session.view.state)
        assertTrue(host.checks.isEmpty())
    }

    @Test
    fun aFailedCheckEndsWithCheckFailed() {
        session.start(null)
        host.checks[0](null, "No connection.")
        assertEquals(CompanionState.ENDED, session.view.state)
        assertEquals("check_failed", session.view.error)
        assertNull(host.socket)
    }

    @Test
    fun opensLiveEvenWhenTheWarningAudioIsMissing() {
        host.warningWav = null
        session.start(report("danger"))
        advance(50)
        assertEquals(CompanionState.CONNECTING, session.view.state)
    }

    @Test
    fun recheckCapturesChecksPlaysTheNewWarningAndSendsContext() {
        toListening()
        frame("""{"type":"action","screen":"RECHECK"}""")
        assertEquals(CompanionState.RECHECKING, session.view.state)
        audio.onChunk!!(pcmB64(100))
        assertEquals("mic is closed while the screen is checked", 0, host.socket!!.ofType("audio").size)
        assertEquals(1, host.checks.size)

        host.checks[0](report("safe", "chk_new").put("spokenWarning", "We found no major warning signs."), null)
        assertEquals(CompanionState.WARNING, session.view.state)
        assertEquals("We found no major warning signs.", host.warnings.last())
        assertTrue(host.socket!!.ofType("context").isEmpty())
        advance(900)
        val context = host.socket!!.ofType("context").single()
        assertEquals("chk_new", context.getString("checkId"))
        assertEquals("safe", context.getJSONObject("report").getString("verdict"))
        assertEquals(CompanionState.THINKING, session.view.state)
        audio.onChunk!!(pcmB64(100))
        assertEquals(1, host.socket!!.ofType("audio").size)
        frame("""{"type":"audio","data":"${pcmB64(200)}"}""")
        assertEquals(CompanionState.SPEAKING, session.view.state)
    }

    @Test
    fun aFailedRecheckTellsTheServer() {
        toListening()
        frame("""{"type":"action","screen":"RECHECK"}""")
        host.checks[0](null, "Could not read the screen.")
        val context = host.socket!!.ofType("context").single()
        assertEquals("check_failed", context.getString("error"))
        assertEquals(CompanionState.THINKING, session.view.state)
    }

    @Test
    fun relaysHotlineAndFamilyActions() {
        toListening()
        frame("""{"type":"action","screen":"HOTLINES"}""")
        frame("""{"type":"action","screen":"WARN_FAMILY"}""")
        frame("""{"type":"action","screen":"BANK"}""")
        assertEquals(listOf("HOTLINES", "WARN_FAMILY"), host.actions)
    }

    @Test
    fun muteStopsTheMicAndUnmuteStartsItAgain() {
        toListening()
        session.toggleMute()
        assertTrue(session.view.muted)
        assertEquals(1, audio.captureStops)
        assertNull(audio.onChunk)
        session.toggleMute()
        assertFalse(session.view.muted)
        assertEquals(2, audio.captureStarts)
        audio.onChunk!!(pcmB64(100))
        assertEquals(1, host.socket!!.ofType("audio").size)
    }

    @Test
    fun bargeInFlushesPlayback() {
        toListening()
        frame("""{"type":"audio","data":"${pcmB64(2000)}"}""")
        frame("""{"type":"interrupted"}""")
        assertEquals(1, audio.flushes)
        assertEquals(CompanionState.LISTENING, session.view.state)
    }

    @Test
    fun endsAtTheCap() {
        toListening(maxMs = 1000)
        advance(999)
        assertEquals(CompanionState.LISTENING, session.view.state)
        advance(5)
        assertEquals(CompanionState.ENDED, session.view.state)
        assertEquals(EndReason.CAP, session.view.endedBy)
    }

    @Test
    fun endsWhenTheShieldStops() {
        toListening()
        session.end(EndReason.SHIELD)
        assertEquals(EndReason.SHIELD, session.view.endedBy)
        assertTrue(audio.released)
        session.toggleMute()
        assertEquals(CompanionState.ENDED, session.view.state)
    }

    @Test
    fun serverErrorAndCloseEndTheSession() {
        toListening()
        frame("""{"type":"error","code":"busy","message":"x"}""")
        assertEquals(EndReason.ERROR, session.view.endedBy)
        assertEquals("busy", session.view.error)

        setUp()
        toListening()
        frame("""{"type":"closed","reason":"cap"}""")
        assertEquals(EndReason.CAP, session.view.endedBy)
    }

    @Test
    fun connectTimeoutAndSocketFailureEndWithUnavailable() {
        session.start(report("danger"))
        advance(900)
        advance(CompanionSession.CONNECT_TIMEOUT_MS)
        assertEquals("unavailable", session.view.error)

        setUp()
        session.start(report("danger"))
        advance(900)
        host.listener!!.onClosed(true)
        assertEquals("unavailable", session.view.error)
    }

    @Test
    fun aMicThatCannotOpenEndsWithAudio() {
        audio.micWorks = false
        toListening()
        assertEquals("audio", session.view.error)
    }

    @Test
    fun audioFocusLossPausesAndGainResumes() {
        toListening()
        frame("""{"type":"audio","data":"${pcmB64(500)}"}""")
        session.onFocus(FocusEvent.LOST_TRANSIENT)
        assertTrue(session.view.paused)
        assertEquals(1, audio.flushes)
        assertEquals(1, audio.captureStops)
        assertEquals(CompanionState.LISTENING, session.view.state)
        val before = audio.played
        frame("""{"type":"audio","data":"${pcmB64(200)}"}""")
        assertEquals("no playback while paused", before, audio.played)
        session.onFocus(FocusEvent.GAINED)
        assertFalse(session.view.paused)
        assertEquals(2, audio.captureStarts)

        session.onFocus(FocusEvent.LOST)
        assertTrue(session.view.paused)
        session.toggleMute()
        assertFalse("a tap resumes after a permanent loss", session.view.paused)
        assertEquals(3, audio.captureStarts)
    }

    @Test
    fun flagsAMicThatOnlyGivesDigitalSilence() {
        toListening()
        val silence = Base64.encodeToString(ByteArray(3200), Base64.NO_WRAP)
        repeat(CompanionSession.SILENT_CHUNKS) { audio.onChunk!!(silence) }
        advance(10)
        assertTrue(session.view.micBlocked)
    }

    @Test
    fun aRealMicIsNotFlagged() {
        toListening()
        audio.onChunk!!(pcmB64(100, 3))
        val silence = Base64.encodeToString(ByteArray(3200), Base64.NO_WRAP)
        repeat(CompanionSession.SILENT_CHUNKS + 5) { audio.onChunk!!(silence) }
        advance(10)
        assertFalse(session.view.micBlocked)
    }

    @Test
    fun reportPayloadKeepsTheServerLimits() {
        val r = report("weird").put("score", 900).put("scamType", "made_up").put("title", "t".repeat(400))
        r.getJSONArray("flags").getJSONObject(0).put("evidence", "e".repeat(700)).put("severity", "huge")
        r.put("sources", org.json.JSONArray().put(JSONObject().put("title", "Advisory").put("url", "https://example.org")))
        r.put("network", JSONObject().put("seenCount", 3))
        val p = CompanionSession.reportPayload(r)
        assertEquals("careful", p.getString("verdict"))
        assertEquals(100.0, p.getDouble("score"), 0.0)
        assertEquals("other", p.getString("scamType"))
        assertEquals(300, p.getString("title").length)
        val flag = p.getJSONArray("flags").getJSONObject(0)
        assertEquals(600, flag.getString("evidence").length)
        assertEquals("low", flag.getString("severity"))
        assertEquals(1, p.getJSONArray("flags").length())
        assertEquals(3, p.getJSONObject("network").getInt("seenCount"))
        assertEquals("Advisory", p.getJSONArray("sources").getJSONObject(0).getString("title"))
    }
}
