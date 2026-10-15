package com.saferoute.liveaudio

import android.util.Base64
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.sqrt

object Pcm {
    const val CAPTURE_RATE = 16_000
    const val PLAYBACK_RATE = 24_000
    const val FRAME_SAMPLES = 1_600

    fun encode(samples: ShortArray, count: Int = samples.size): String {
        val bytes = ByteBuffer.allocate(count * 2).order(ByteOrder.LITTLE_ENDIAN)
        for (i in 0 until count) bytes.putShort(samples[i])
        return Base64.encodeToString(bytes.array(), Base64.NO_WRAP)
    }

    fun decode(base64: String): ByteArray {
        val raw = Base64.decode(base64, Base64.DEFAULT)
        return if (raw.size % 2 == 0) raw else raw.copyOf(raw.size - 1)
    }

    fun toSamples(bytes: ByteArray): ShortArray {
        val out = ShortArray(bytes.size / 2)
        ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(out)
        return out
    }

    fun rms(samples: ShortArray, count: Int = samples.size): Float {
        if (count <= 0) return 0f
        var sum = 0.0
        for (i in 0 until count) {
            val v = samples[i] / 32768.0
            sum += v * v
        }
        return sqrt(sum / count).toFloat()
    }

    fun rmsOfBytes(bytes: ByteArray, offset: Int, length: Int): Float {
        val n = length / 2
        if (n <= 0) return 0f
        var sum = 0.0
        for (i in 0 until n) {
            val lo = bytes[offset + 2 * i].toInt() and 0xFF
            val hi = bytes[offset + 2 * i + 1].toInt()
            val v = ((hi shl 8) or lo).toShort() / 32768.0
            sum += v * v
        }
        return sqrt(sum / n).toFloat()
    }
}

/** Regroups arbitrary read sizes into exact frames. */
class FrameAssembler(private val frameSamples: Int = Pcm.FRAME_SAMPLES, private val onFrame: (ShortArray) -> Unit) {
    private val pending = ShortArray(frameSamples)
    private var filled = 0

    fun push(buf: ShortArray, count: Int) {
        var pos = 0
        while (pos < count) {
            val take = minOf(frameSamples - filled, count - pos)
            System.arraycopy(buf, pos, pending, filled, take)
            filled += take
            pos += take
            if (filled == frameSamples) {
                onFrame(pending.copyOf())
                filled = 0
            }
        }
    }

    fun reset() {
        filled = 0
    }
}

/**
 * Smoothed 0..1 loudness. Speech RMS sits near 0.02..0.2 of full scale, so [GAIN] stretches it
 * across the range. Rises fast, falls with [DECAY_MS] time constant, also while no audio arrives.
 */
class LevelMeter(private val clock: () -> Long = System::nanoTime) {
    @Volatile private var value = 0f
    @Volatile private var stamp = clock()

    @Synchronized
    fun update(rms: Float) {
        val now = decayed()
        val target = (rms * GAIN).coerceIn(0f, 1f)
        value = if (target > now) target else now
        stamp = clock()
    }

    fun level(): Float = decayed().coerceIn(0f, 1f)

    @Synchronized
    fun reset() {
        value = 0f
        stamp = clock()
    }

    private fun decayed(): Float {
        val dtMs = (clock() - stamp) / 1_000_000f
        return value * Math.exp((-dtMs / DECAY_MS).toDouble()).toFloat()
    }

    companion object {
        const val GAIN = 4f
        const val DECAY_MS = 120f
    }
}
