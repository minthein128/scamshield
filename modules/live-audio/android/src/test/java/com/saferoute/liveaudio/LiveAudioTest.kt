package com.saferoute.liveaudio

import android.media.AudioDeviceInfo
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong

private class FakeSource(private val reads: List<ShortArray>) : PcmSource {
    private val queue = LinkedBlockingQueue(reads)
    @Volatile var stopped = false
    @Volatile var released = false
    override fun start() = Unit
    override fun read(buf: ShortArray, count: Int): Int {
        val next = queue.poll(20, TimeUnit.MILLISECONDS)
        if (next == null) return if (stopped) -1 else 0
        System.arraycopy(next, 0, buf, 0, next.size)
        return next.size
    }
    override fun stop() { stopped = true }
    override fun release() { released = true }
}

private class FakeSink(private val acceptPerWrite: Int = Int.MAX_VALUE) : PcmSink {
    val written = CopyOnWriteArrayList<Byte>()
    val events = CopyOnWriteArrayList<String>()
    @Volatile var blocked = false
    override fun play() { events += "play" }
    override fun write(buf: ByteArray, offset: Int, length: Int): Int {
        if (blocked) return 0
        val n = minOf(length, acceptPerWrite)
        for (i in 0 until n) written += buf[offset + i]
        return n
    }
    override fun pauseAndFlush() {
        events += "flush"
        written.clear()
    }
    override fun release() { events += "release" }
}

private fun waitUntil(timeoutMs: Long = 2000, cond: () -> Boolean) {
    val end = System.currentTimeMillis() + timeoutMs
    while (!cond() && System.currentTimeMillis() < end) Thread.sleep(5)
    assertTrue("condition not met in time", cond())
}

private fun pcmBytes(vararg samples: Int): ByteArray {
    val out = ByteArray(samples.size * 2)
    samples.forEachIndexed { i, s ->
        out[2 * i] = (s and 0xFF).toByte()
        out[2 * i + 1] = ((s shr 8) and 0xFF).toByte()
    }
    return out
}

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class PcmFramingTest {
    @Test
    fun base64RoundTripKeepsSamplesAndLittleEndianOrder() {
        val samples = shortArrayOf(0, 1, -1, 256, Short.MAX_VALUE, Short.MIN_VALUE)
        val b64 = Pcm.encode(samples)
        val bytes = Pcm.decode(b64)
        assertEquals(12, bytes.size)
        assertEquals(0x01, bytes[2].toInt())
        assertEquals(0x00, bytes[3].toInt())
        assertArrayEquals(samples, Pcm.toSamples(bytes))
    }

    @Test
    fun decodeDropsTrailingOddByte() {
        val b64 = android.util.Base64.encodeToString(byteArrayOf(1, 0, 9), android.util.Base64.NO_WRAP)
        assertEquals(2, Pcm.decode(b64).size)
    }

    @Test
    fun assemblerEmitsExact1600SampleFramesFromUnevenReads() {
        val frames = mutableListOf<ShortArray>()
        val asm = FrameAssembler { frames += it }
        val all = ShortArray(4000) { it.toShort() }
        var pos = 0
        for (size in listOf(700, 1300, 1, 999, 1000)) {
            asm.push(all.copyOfRange(pos, pos + size), size)
            pos += size
        }
        assertEquals(2, frames.size)
        frames.forEach { assertEquals(Pcm.FRAME_SAMPLES, it.size) }
        assertArrayEquals(all.copyOfRange(0, 1600), frames[0])
        assertArrayEquals(all.copyOfRange(1600, 3200), frames[1])
    }

    @Test
    fun captureEngineEmitsDecodableFramesAndStopsCleanly() {
        val reads = listOf(ShortArray(800) { 1000 }, ShortArray(800) { 1000 }, ShortArray(1600) { 2000 })
        val source = FakeSource(reads)
        val meter = LevelMeter()
        val chunks = CopyOnWriteArrayList<String>()
        val engine = CaptureEngine(source, meter, { chunks += it })
        engine.start()
        waitUntil { chunks.size == 2 }
        engine.stop()
        assertTrue(source.stopped && source.released)
        val first = Pcm.toSamples(Pcm.decode(chunks[0]))
        assertEquals(1600, first.size)
        assertTrue(first.all { it == 1000.toShort() })
        assertTrue(Pcm.toSamples(Pcm.decode(chunks[1])).all { it == 2000.toShort() })
        assertEquals(0f, meter.level(), 0f)
    }
}

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class PlaybackQueueTest {
    @Test
    fun chunksPlayInOrderWithoutGaps() {
        val sink = FakeSink(acceptPerWrite = 500)
        val engine = PlaybackEngine(sink, LevelMeter())
        engine.start()
        val a = ByteArray(2000) { 1 }
        val b = ByteArray(1500) { 2 }
        val c = ByteArray(700) { 3 }
        engine.enqueue(a); engine.enqueue(b); engine.enqueue(c)
        waitUntil { sink.written.size == 4200 }
        val expected = a.toList() + b.toList() + c.toList()
        assertEquals(expected, sink.written.toList())
        engine.stop()
    }

    @Test
    fun startPlaysOnceAndKeepsRunning() {
        val sink = FakeSink()
        val engine = PlaybackEngine(sink, LevelMeter())
        engine.start()
        engine.start()
        engine.enqueue(ByteArray(100))
        waitUntil { sink.written.size == 100 }
        assertEquals(1, sink.events.count { it == "play" })
        engine.stop()
    }

    @Test
    fun flushDropsQueueAndResumesForLaterChunks() {
        val sink = FakeSink()
        sink.blocked = true
        val engine = PlaybackEngine(sink, LevelMeter())
        engine.start()
        engine.enqueue(ByteArray(3000) { 7 })
        engine.enqueue(ByteArray(3000) { 8 })
        engine.flush()
        assertEquals(0, engine.queuedChunks)
        assertEquals(listOf("play", "flush", "play"), sink.events.toList())
        sink.blocked = false
        Thread.sleep(50)
        assertEquals(0, sink.written.size)
        val fresh = ByteArray(960) { 9 }
        engine.enqueue(fresh)
        waitUntil { sink.written.size == 960 }
        assertEquals(fresh.toList(), sink.written.toList())
        engine.stop()
    }

    @Test
    fun staleSlicesOfAFlushedChunkAreNotWritten() {
        val sink = FakeSink(acceptPerWrite = 960)
        val engine = PlaybackEngine(sink, LevelMeter())
        engine.start()
        engine.enqueue(ByteArray(96_000) { 5 })
        waitUntil { sink.written.isNotEmpty() }
        engine.flush()
        Thread.sleep(100)
        assertTrue("stale audio leaked: ${sink.written.size}", sink.written.size <= 960)
        engine.stop()
    }
}

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class LevelMeterTest {
    @Test
    fun rmsOfSilenceIsZeroAndFullScaleIsOne() {
        assertEquals(0f, Pcm.rms(ShortArray(100)), 0f)
        assertEquals(1f, Pcm.rms(ShortArray(100) { Short.MIN_VALUE }), 1e-6f)
        assertEquals(0.5f, Pcm.rms(ShortArray(100) { 16384 }), 1e-4f)
    }

    @Test
    fun byteRmsMatchesSampleRms() {
        val bytes = pcmBytes(16384, -16384, 16384, -16384)
        assertEquals(0.5f, Pcm.rmsOfBytes(bytes, 0, bytes.size), 1e-4f)
        assertEquals(0f, Pcm.rmsOfBytes(bytes, 0, 1), 0f)
    }

    @Test
    fun levelClampsRisesFastAndDecaysWithTime() {
        val now = AtomicLong(0)
        val meter = LevelMeter { now.get() }
        assertEquals(0f, meter.level(), 0f)
        meter.update(0.1f)
        assertEquals(0.4f, meter.level(), 1e-4f)
        meter.update(0.9f)
        assertEquals(1f, meter.level(), 0f)
        now.addAndGet(120_000_000L)
        assertEquals(0.3679f, meter.level(), 1e-3f)
        meter.update(0.01f)
        assertEquals(0.3679f, meter.level(), 1e-3f)
        now.addAndGet(2_000_000_000L)
        assertTrue(meter.level() < 0.001f)
        meter.update(0.2f)
        meter.reset()
        assertEquals(0f, meter.level(), 0f)
    }

    @Test
    fun playbackUpdatesOutputMeterFromWrittenBytes() {
        val sink = FakeSink()
        val meter = LevelMeter { 0L }
        val engine = PlaybackEngine(sink, meter)
        engine.start()
        engine.enqueue(ByteArray(960) { if (it % 2 == 1) 0x20 else 0 })
        waitUntil { meter.level() > 0.3f }
        engine.stop()
    }
}

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class RouteTest {
    @Test
    fun wiredBeatsBluetoothBeatsSpeaker() {
        assertEquals(Route.SPEAKER, chooseRoute(listOf(AudioDeviceInfo.TYPE_BUILTIN_EARPIECE, AudioDeviceInfo.TYPE_BUILTIN_SPEAKER)))
        assertEquals(Route.BLUETOOTH, chooseRoute(listOf(AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, AudioDeviceInfo.TYPE_BLUETOOTH_SCO)))
        assertEquals(Route.HEADSET, chooseRoute(listOf(AudioDeviceInfo.TYPE_BLUETOOTH_SCO, AudioDeviceInfo.TYPE_WIRED_HEADSET)))
    }
}
