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
                "end" to "",
                "speaking" to 42,
                "unknown" to "x",
                "captionHint" to "y".repeat(400),
            )
        )
        assertEquals("Nar htaung nay", s.listening)
        assertEquals("End", s.end)
        assertEquals("Speaking", s.speaking)
        assertEquals(ShieldStrings.MAX_LENGTH, s.captionHint.length)
        assertEquals("unknown", s["unknown"])
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
}
