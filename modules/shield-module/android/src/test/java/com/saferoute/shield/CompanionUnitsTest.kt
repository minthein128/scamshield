package com.saferoute.shield

import android.media.AudioManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.nio.ByteBuffer
import java.nio.ByteOrder

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class CompanionUnitsTest {

    @Test
    fun stringsKeepKnownKeysTrimmedAndCapped() {
        val s = ShieldStrings.from(
            mapOf(
                "listening" to "  Nar   htaung nay ",
                "muted" to "",
                "speaking" to 42,
                "unknown" to "x",
                "endA11y" to "y".repeat(400),
            )
        )
        assertEquals("Nar htaung nay", s.listening)
        assertEquals("blank falls back to English", "Muted", s.muted)
        assertEquals("Speaking", s.speaking)
        assertEquals(ShieldStrings.MAX_LENGTH, s.endA11y.length)
        assertEquals("unknown", s["unknown"])
        assertEquals("Pyit Taing Htaung", ShieldStrings.DEFAULT.name)
        assertEquals("ပစ်တိုင်းထောင်", ShieldStrings.from(mapOf("name" to "ပစ်တိုင်းထောင်")).name)
    }

    @Test
    fun stringsFallBackToEnglishAndMapErrors() {
        assertSame(ShieldStrings.DEFAULT, ShieldStrings.from(null))
        val s = ShieldStrings.from(mapOf("busy" to "Busy now"))
        assertEquals("Busy now", s.error("busy"))
        assertEquals(ShieldStrings.DEFAULTS["rateLimited"], s.error("rate_limited"))
        assertEquals(ShieldStrings.DEFAULTS["needsForeground"], s.error("needs_foreground"))
        assertEquals(ShieldStrings.DEFAULTS["unavailable"], s.error("upstream"))
        assertEquals(ShieldStrings.DEFAULTS["unavailable"], s.error(null))
    }

    @Test
    fun everyDefaultHasText() {
        for ((k, v) in ShieldStrings.DEFAULTS) assertEquals(k, true, v.isNotBlank() && v.length <= ShieldStrings.MAX_LENGTH)
    }

    private fun wav(rate: Int, channels: Int, frames: Int, value: Short): ByteArray {
        val data = frames * channels * 2
        val b = ByteBuffer.allocate(44 + 10 + data).order(ByteOrder.LITTLE_ENDIAN)
        b.put("RIFF".toByteArray()).putInt(46 + data).put("WAVE".toByteArray())
        b.put("fmt ".toByteArray()).putInt(16).putShort(1).putShort(channels.toShort()).putInt(rate)
            .putInt(rate * channels * 2).putShort((channels * 2).toShort()).putShort(16)
        b.put("LIST".toByteArray()).putInt(2).putShort(0)
        b.put("data".toByteArray()).putInt(data)
        repeat(frames * channels) { b.putShort(value) }
        return b.array()
    }

    @Test
    fun wavAt24kMonoPassesThrough() {
        val pcm = WavPcm.toPcm24k(wav(24_000, 1, 2400, 1234))!!
        assertEquals(4800, pcm.size)
        assertEquals(1234, ByteBuffer.wrap(pcm).order(ByteOrder.LITTLE_ENDIAN).getShort(100).toInt())
        assertEquals(100, WavPcm.durationMs(pcm))
    }

    @Test
    fun wavIsDownmixedAndResampled() {
        val pcm = WavPcm.toPcm24k(wav(48_000, 2, 4800, 800))!!
        assertEquals(2400 * 2, pcm.size)
        assertEquals(800, ByteBuffer.wrap(pcm).order(ByteOrder.LITTLE_ENDIAN).getShort(10).toInt())
    }

    @Test
    fun badWavIsRejected() {
        assertNull(WavPcm.toPcm24k(ByteArray(10)))
        assertNull(WavPcm.toPcm24k("RIFF0000WAVEjunk".toByteArray()))
    }

    @Test
    fun focusChangesMapToPauseAndResume() {
        assertEquals(FocusEvent.LOST, focusEventOf(AudioManager.AUDIOFOCUS_LOSS))
        assertEquals(FocusEvent.LOST_TRANSIENT, focusEventOf(AudioManager.AUDIOFOCUS_LOSS_TRANSIENT))
        assertEquals(FocusEvent.LOST_TRANSIENT, focusEventOf(AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK))
        assertEquals(FocusEvent.GAINED, focusEventOf(AudioManager.AUDIOFOCUS_GAIN))
        assertNull(focusEventOf(12345))
    }

    @Test
    fun liveUrlSwitchesTheScheme() {
        assertEquals("wss://api.example.org/v1/live", OkHttpCompanionSocket.liveUrl("https://api.example.org/"))
        assertEquals("ws://10.0.2.2:8080/v1/live", OkHttpCompanionSocket.liveUrl("http://10.0.2.2:8080"))
    }

    private class Recorder : CompanionSocketListener {
        val events = mutableListOf<String>()
        override fun onOpen() { events += "open" }
        override fun onText(text: String) { events += "text:$text" }
        override fun onClosed(failed: Boolean) { events += "closed:$failed" }
    }

    private class FakeSocket : CompanionSocket {
        var closed = false
        override fun send(text: String) = true
        override fun close() { closed = true }
    }

    @Test
    fun failoverSocketOpensTheNextHostWhenTheFirstFailsBeforeOpening() {
        val recorder = Recorder()
        val opened = mutableListOf<String>()
        val listeners = mutableListOf<CompanionSocketListener>()
        val used = mutableListOf<String>()
        FailoverCompanionSocket(listOf("https://a", "https://b"), recorder, { used += it }, { base, l, _ ->
            opened += base
            listeners += l
            FakeSocket()
        })
        assertEquals(listOf("https://a"), opened)
        listeners[0].onClosed(true)
        assertEquals(listOf("https://a", "https://b"), opened)
        assertEquals(emptyList<String>(), recorder.events)
        listeners[1].onOpen()
        assertEquals(listOf("open"), recorder.events)
        assertEquals(listOf("https://b"), used)
    }

    @Test
    fun failoverSocketReportsTheFailureOfTheLastHostAndAfterOpening() {
        val recorder = Recorder()
        val listeners = mutableListOf<CompanionSocketListener>()
        FailoverCompanionSocket(listOf("https://a", "https://b"), recorder, {}, { _, l, _ ->
            listeners += l
            FakeSocket()
        })
        listeners[0].onClosed(true)
        listeners[1].onClosed(true)
        assertEquals(listOf("closed:true"), recorder.events)

        val after = Recorder()
        val seen = mutableListOf<CompanionSocketListener>()
        FailoverCompanionSocket(listOf("https://a", "https://b"), after, {}, { _, l, _ ->
            seen += l
            FakeSocket()
        })
        seen[0].onOpen()
        seen[0].onClosed(true)
        assertEquals(1, seen.size)
        assertEquals(listOf("open", "closed:true"), after.events)
    }
}
