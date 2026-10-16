package com.saferoute.liveaudio

import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

class PlaybackEngine(private val sink: PcmSink, private val meter: LevelMeter) {
    private class Chunk(val bytes: ByteArray, val generation: Int)

    private val queue = LinkedBlockingQueue<Chunk>()
    private val lock = Any()
    private var generation = 0
    private var thread: Thread? = null
    @Volatile private var running = false

    val queuedChunks: Int get() = queue.size

    fun start() {
        synchronized(lock) {
            if (running) return
            running = true
            sink.play()
        }
        thread = Thread(::loop, "live-audio-playback").also { it.start() }
    }

    fun enqueue(bytes: ByteArray) {
        if (bytes.isEmpty()) return
        val gen = synchronized(lock) { generation }
        queue.put(Chunk(bytes, gen))
    }

    /** Barge-in: drop queued audio, cut what the sink holds, keep the sink ready for new chunks. */
    fun flush() {
        synchronized(lock) {
            generation++
            queue.clear()
            sink.pauseAndFlush()
            if (running) sink.play()
        }
        meter.reset()
    }

    fun stop() {
        synchronized(lock) {
            running = false
            generation++
            queue.clear()
        }
        thread?.interrupt()
        thread?.join(500)
        thread = null
        runCatching { sink.pauseAndFlush() }
        runCatching { sink.release() }
        meter.reset()
    }

    private fun loop() {
        try {
            while (running) {
                val chunk = queue.poll(50, TimeUnit.MILLISECONDS) ?: continue
                var off = 0
                while (off < chunk.bytes.size && running) {
                    val len = minOf(SLICE_BYTES, chunk.bytes.size - off)
                    val written = synchronized(lock) {
                        if (chunk.generation != generation) return@synchronized -1
                        sink.write(chunk.bytes, off, len).also {
                            if (it > 0) meter.update(Pcm.rmsOfBytes(chunk.bytes, off, it))
                        }
                    }
                    if (written < 0) break
                    if (written == 0) Thread.sleep(5) else off += written
                }
            }
        } catch (_: InterruptedException) {
        }
    }

    companion object {
        /** 20 ms at 24 kHz mono 16-bit. Bounds how much stale audio one write can leave after a flush. */
        const val SLICE_BYTES = 960
    }
}
