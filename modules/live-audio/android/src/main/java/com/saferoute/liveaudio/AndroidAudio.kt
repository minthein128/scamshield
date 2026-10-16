package com.saferoute.liveaudio

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.NoiseSuppressor
import android.os.Build

@SuppressLint("MissingPermission")
class AudioRecordSource : PcmSource {
    private val record: AudioRecord
    private var aec: AcousticEchoCanceler? = null
    private var ns: NoiseSuppressor? = null

    init {
        val min = AudioRecord.getMinBufferSize(
            Pcm.CAPTURE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT
        )
        val bytes = maxOf(min, Pcm.FRAME_SAMPLES * 2 * 4)
        record = AudioRecord(
            MediaRecorder.AudioSource.VOICE_COMMUNICATION,
            Pcm.CAPTURE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bytes
        )
        if (record.state != AudioRecord.STATE_INITIALIZED) {
            record.release()
            throw IllegalStateException("AudioRecord failed to initialise")
        }
        if (AcousticEchoCanceler.isAvailable()) {
            aec = runCatching { AcousticEchoCanceler.create(record.audioSessionId)?.also { it.enabled = true } }.getOrNull()
        }
        if (NoiseSuppressor.isAvailable()) {
            ns = runCatching { NoiseSuppressor.create(record.audioSessionId)?.also { it.enabled = true } }.getOrNull()
        }
    }

    val echoCancelerActive: Boolean get() = aec?.enabled == true
    val noiseSuppressorActive: Boolean get() = ns?.enabled == true

    override fun start() = record.startRecording()
    override fun read(buf: ShortArray, count: Int): Int = record.read(buf, 0, count)
    override fun stop() {
        if (record.recordingState == AudioRecord.RECORDSTATE_RECORDING) record.stop()
    }

    override fun release() {
        aec?.release()
        ns?.release()
        aec = null
        ns = null
        record.release()
    }
}

class AudioTrackSink : PcmSink {
    private val track: AudioTrack

    init {
        val min = AudioTrack.getMinBufferSize(
            Pcm.PLAYBACK_RATE, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT
        )
        val bytes = maxOf(min, Pcm.PLAYBACK_RATE * 2 / 5)
        track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setSampleRate(Pcm.PLAYBACK_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .build()
            )
            .setBufferSizeInBytes(bytes)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()
        if (track.state != AudioTrack.STATE_INITIALIZED) {
            track.release()
            throw IllegalStateException("AudioTrack failed to initialise")
        }
    }

    override fun play() = track.play()
    override fun write(buf: ByteArray, offset: Int, length: Int): Int =
        track.write(buf, offset, length, AudioTrack.WRITE_NON_BLOCKING)

    override fun pauseAndFlush() {
        track.pause()
        track.flush()
    }

    override fun release() = track.release()
}

/** Chooses where a session's audio goes. Pure so it can be tested without a device. */
enum class Route { HEADSET, BLUETOOTH, SPEAKER }

fun chooseRoute(deviceTypes: Collection<Int>): Route = when {
    deviceTypes.any { it in WIRED_TYPES } -> Route.HEADSET
    deviceTypes.any { it in BLUETOOTH_TYPES } -> Route.BLUETOOTH
    else -> Route.SPEAKER
}

private val WIRED_TYPES = setOf(
    AudioDeviceInfo.TYPE_WIRED_HEADSET,
    AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
    AudioDeviceInfo.TYPE_USB_HEADSET,
)
private val BLUETOOTH_TYPES = setOf(AudioDeviceInfo.TYPE_BLUETOOTH_SCO, AudioDeviceInfo.TYPE_BLE_HEADSET)

/**
 * Focus, mode and routing for one live session. With [communicationMode] on, the platform
 * treats the stream as a call, which is what gives voice-communication AEC its reference signal.
 */
class AndroidAudioSession(
    context: Context,
    @Volatile var communicationMode: Boolean = true,
) : AudioSession {
    private val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var active = false
    private var savedMode = AudioManager.MODE_NORMAL
    private var savedSpeaker = false
    private var focusRequest: AudioFocusRequest? = null
    private var scoStarted = false
    private val focusListener = AudioManager.OnAudioFocusChangeListener { }

    @Synchronized
    override fun begin() {
        if (active) return
        active = true
        savedMode = audio.mode
        @Suppress("DEPRECATION")
        savedSpeaker = audio.isSpeakerphoneOn
        requestFocus()
        if (communicationMode) audio.mode = AudioManager.MODE_IN_COMMUNICATION
        route()
    }

    @Synchronized
    override fun end() {
        if (!active) return
        active = false
        if (Build.VERSION.SDK_INT >= 31) {
            audio.clearCommunicationDevice()
        }
        if (scoStarted) {
            @Suppress("DEPRECATION")
            audio.stopBluetoothSco()
            scoStarted = false
        }
        @Suppress("DEPRECATION")
        audio.isSpeakerphoneOn = savedSpeaker
        audio.mode = savedMode
        abandonFocus()
    }

    private fun route() {
        val outputs = audio.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
        val choice = chooseRoute(outputs.map { it.type })
        if (Build.VERSION.SDK_INT >= 31 && communicationMode) {
            val wanted = when (choice) {
                Route.HEADSET -> WIRED_TYPES
                Route.BLUETOOTH -> BLUETOOTH_TYPES
                Route.SPEAKER -> setOf(AudioDeviceInfo.TYPE_BUILTIN_SPEAKER)
            }
            val device = audio.availableCommunicationDevices.firstOrNull { it.type in wanted }
            if (device != null && audio.setCommunicationDevice(device)) return
        }
        @Suppress("DEPRECATION")
        when (choice) {
            Route.HEADSET -> audio.isSpeakerphoneOn = false
            Route.BLUETOOTH -> {
                audio.isSpeakerphoneOn = false
                if (communicationMode) {
                    audio.startBluetoothSco()
                    scoStarted = true
                }
            }
            Route.SPEAKER -> audio.isSpeakerphoneOn = true
        }
    }

    private fun requestFocus() {
        if (Build.VERSION.SDK_INT >= 26) {
            val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setOnAudioFocusChangeListener(focusListener)
                .build()
            focusRequest = req
            audio.requestAudioFocus(req)
        } else {
            @Suppress("DEPRECATION")
            audio.requestAudioFocus(
                focusListener, AudioManager.STREAM_VOICE_CALL, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
            )
        }
    }

    private fun abandonFocus() {
        if (Build.VERSION.SDK_INT >= 26) {
            focusRequest?.let { audio.abandonAudioFocusRequest(it) }
            focusRequest = null
        } else {
            @Suppress("DEPRECATION")
            audio.abandonAudioFocus(focusListener)
        }
    }
}
