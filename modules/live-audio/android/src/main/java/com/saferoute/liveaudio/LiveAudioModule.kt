package com.saferoute.liveaudio

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LiveAudioModule : Module() {
    private val inputMeter = LevelMeter()
    private val outputMeter = LevelMeter()
    private var session: AndroidAudioSession? = null
    private var capture: CaptureEngine? = null
    private var playback: PlaybackEngine? = null
    @Volatile private var communicationMode = true

    override fun definition() = ModuleDefinition {
        Name("LiveAudio")

        Events("onAudioChunk", "onAudioError")

        AsyncFunction("requestPermission") { promise: Promise ->
            val context = appContext.reactContext
            if (context == null) {
                promise.resolve(false)
                return@AsyncFunction
            }
            if (hasMicPermission()) {
                promise.resolve(true)
                return@AsyncFunction
            }
            val permissions = appContext.permissions
            if (permissions == null) {
                promise.resolve(false)
                return@AsyncFunction
            }
            permissions.askForPermissions({ result ->
                promise.resolve(result[Manifest.permission.RECORD_AUDIO]?.status == expo.modules.interfaces.permissions.PermissionsStatus.GRANTED)
            }, Manifest.permission.RECORD_AUDIO)
        }

        AsyncFunction("startCapture") {
            if (!hasMicPermission()) {
                throw CodedException("ERR_NO_PERMISSION", "Microphone permission is not granted", null)
            }
            openCapture()
        }

        AsyncFunction("stopCapture") {
            synchronized(this@LiveAudioModule) {
                capture?.stop()
                capture = null
            }
        }

        Function("playChunk") { base64: String ->
            val engine = synchronized(this@LiveAudioModule) {
                playback ?: run {
                    ensureSession().begin()
                    PlaybackEngine(AudioTrackSink(), outputMeter).also {
                        it.start()
                        playback = it
                    }
                }
            }
            engine.enqueue(Pcm.decode(base64))
        }

        Function("stopPlayback") {
            playback?.flush()
        }

        Function("inputLevel") { inputMeter.level() }
        Function("outputLevel") { outputMeter.level() }

        Function("setCommunicationMode") { enabled: Boolean ->
            communicationMode = enabled
            session?.communicationMode = enabled
        }

        AsyncFunction("dispose") { disposeAll() }

        OnDestroy { disposeAll() }
    }

    private fun hasMicPermission(): Boolean {
        val context = appContext.reactContext ?: return false
        return ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
    }

    @Synchronized
    private fun openCapture() {
        if (capture?.isRunning == true) return
        ensureSession().begin()
        val source = try {
            AudioRecordSource()
        } catch (e: Exception) {
            throw CodedException("ERR_CAPTURE_INIT", e.message ?: "Cannot open microphone", e)
        }
        capture = CaptureEngine(
            source,
            inputMeter,
            onChunk = { b64 -> sendEvent("onAudioChunk", mapOf("data" to b64)) },
            onFailure = { msg -> sendEvent("onAudioError", mapOf("message" to msg)) },
        ).also { it.start() }
    }

    @Synchronized
    private fun ensureSession(): AndroidAudioSession {
        session?.let { return it }
        val context = appContext.reactContext
            ?: throw CodedException("ERR_NO_CONTEXT", "React context is not available", null)
        return AndroidAudioSession(context, communicationMode).also { session = it }
    }

    @Synchronized
    private fun disposeAll() {
        capture?.stop()
        capture = null
        playback?.stop()
        playback = null
        session?.end()
        session = null
    }
}
