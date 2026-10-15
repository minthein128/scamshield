package com.saferoute.shield

import android.content.Context
import android.media.AudioManager
import com.saferoute.liveaudio.AndroidAudioSession
import com.saferoute.liveaudio.AudioRecordSource
import com.saferoute.liveaudio.AudioTrackSink
import com.saferoute.liveaudio.CaptureEngine
import com.saferoute.liveaudio.LevelMeter
import com.saferoute.liveaudio.PlaybackEngine

/** Mic and speaker for one companion session. Capture and playback run on their own threads. */
interface CompanionAudio {
    /** Starts 16 kHz capture; chunks are base64 PCM on the capture thread. False when the mic cannot open. */
    fun startCapture(onChunk: (String) -> Unit): Boolean
    fun stopCapture()
    /** Queues 24 kHz mono PCM16 for gapless playback. */
    fun play(pcm24k: ByteArray)
    /** Barge-in: drops queued and buffered audio at once. */
    fun flush()
    fun inputLevel(): Float
    fun outputLevel(): Float
    fun release()
}

/** Audio focus as the session sees it. */
enum class FocusEvent { LOST, LOST_TRANSIENT, GAINED }

fun focusEventOf(change: Int): FocusEvent? = when (change) {
    AudioManager.AUDIOFOCUS_LOSS -> FocusEvent.LOST
    AudioManager.AUDIOFOCUS_LOSS_TRANSIENT, AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> FocusEvent.LOST_TRANSIENT
    AudioManager.AUDIOFOCUS_GAIN, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT -> FocusEvent.GAINED
    else -> null
}

class CompanionAudioEngine(
    context: Context,
    onFocus: (FocusEvent) -> Unit,
) : CompanionAudio {
    private val inputMeter = LevelMeter()
    private val outputMeter = LevelMeter()
    private val session = AndroidAudioSession(context.applicationContext, true) { change -> focusEventOf(change)?.let(onFocus) }
    private var capture: CaptureEngine? = null
    private var playback: PlaybackEngine? = null
    private var released = false

    @Synchronized
    override fun startCapture(onChunk: (String) -> Unit): Boolean {
        if (released) return false
        if (capture?.isRunning == true) return true
        return try {
            session.begin()
            capture = CaptureEngine(AudioRecordSource(), inputMeter, onChunk).also { it.start() }
            true
        } catch (e: Exception) {
            capture = null
            false
        }
    }

    @Synchronized
    override fun stopCapture() {
        capture?.stop()
        capture = null
    }

    override fun play(pcm24k: ByteArray) {
        val engine = synchronized(this) {
            if (released) return
            playback ?: try {
                session.begin()
                PlaybackEngine(AudioTrackSink(), outputMeter).also {
                    it.start()
                    playback = it
                }
            } catch (e: Exception) {
                return
            }
        }
        engine.enqueue(pcm24k)
    }

    override fun flush() {
        playback?.flush()
    }

    override fun inputLevel(): Float = inputMeter.level()
    override fun outputLevel(): Float = outputMeter.level()

    @Synchronized
    override fun release() {
        if (released) return
        released = true
        capture?.stop()
        capture = null
        playback?.stop()
        playback = null
        runCatching { session.end() }
    }
}
