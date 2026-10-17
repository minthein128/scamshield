package com.saferoute.shield

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.Manifest
import android.app.Service
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class ShieldService : Service(), ShieldOverlay.Listener {

    private val main = Handler(Looper.getMainLooper())
    private val worker: ExecutorService = Executors.newSingleThreadExecutor()
    private val busy = AtomicBoolean(false)
    private var overlay: ShieldOverlay? = null
    private var capturer: ScreenSource? = null
    private var started = false
    private var awaitingConsent = false
    @Volatile private var apiUrl = ""
    @Volatile private var fallbackApiUrl = ""
    private var language = "en"
    private var lastId: String? = null
    private var lastJson: String? = null
    private var companion: CompanionSession? = null
    private var pendingCheck: ((JSONObject?, String?) -> Unit)? = null
    private var lastCheckError: String? = null
    private var projectionTyped = false
    private var micTyped = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        intent?.getStringExtra(EXTRA_API_URL)?.let { apiUrl = it }
        fallbackApiUrl = intent?.getStringExtra(EXTRA_FALLBACK_API_URL).orEmpty()
        intent?.getStringExtra(EXTRA_LANGUAGE)?.let { if (it.isNotBlank()) language = it }
        if (!started) {
            started = true
            createNotificationChannel()
            promoteToForeground(withProjection = false)
            overlay = ShieldOverlay(this, this).also {
                it.strings = ShieldBridge.strings
                it.show()
            }
            isRunning = true
            ShieldBridge.publishRunning(true)
            if (ShieldBridge.pendingConsent != null) onConsentGranted()
        }
        overlay?.strings = ShieldBridge.strings
        armVoice()
        return START_NOT_STICKY
    }

    fun hasProjection(): Boolean = capturer != null

    internal val overlayForTest: ShieldOverlay? get() = overlay

    fun onConsentGranted() {
        main.post {
            if (!started) return@post
            val consent = ShieldBridge.takeConsent() ?: return@post
            var source: ScreenSource? = null
            try {
                promoteToForeground(withProjection = true)
                capturer?.release()
                capturer = null
                source = openCapture(this, consent) { main.post { if (source != null && capturer === source) onProjectionStopped() } }
            } catch (e: Exception) {
                Log.w(TAG, "projection failed reused=${consent.uses > 1}: ${e.javaClass.simpleName}")
            }
            if (source == null) {
                ShieldBridge.forgetConsent(consent)
                if (consent.uses > 1) {
                    if (awaitingConsent) askConsent()
                    return@post
                }
                awaitingConsent = false
                failCheck("Screen capture could not start. Tap the shield to try again.")
                return@post
            }
            capturer = source
            if (awaitingConsent) {
                awaitingConsent = false
                startCheck()
            }
        }
    }

    /** The user or the system ended screen sharing. The kept consent no longer opens a projection. */
    private fun onProjectionStopped() {
        capturer = null
        ShieldBridge.forgetConsent(null)
    }

    fun onConsentDenied() {
        main.post {
            if (!awaitingConsent) return@post
            awaitingConsent = false
            failCheck("Screen capture was not allowed. Tap the shield to try again.")
        }
    }

    fun requestCheck() {
        main.post { checkNow() }
    }

    private fun checkNow() {
        if (!started || busy.get() || awaitingConsent) return
        if (capturer == null) {
            awaitingConsent = true
            if (ShieldBridge.pendingConsent != null) onConsentGranted() else askConsent()
            return
        }
        startCheck()
    }

    /** Shows the system screen-capture dialog. On Android 14 and up the first bubble tap lands here. */
    private fun askConsent() {
        awaitingConsent = true
        overlay?.reset()
        val intent = Intent(this, ConsentActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            startActivity(intent)
        } catch (e: Exception) {
            awaitingConsent = false
            failCheck("Could not ask for screen capture permission.")
        }
    }

    private fun startCheck() {
        val currentCapturer = capturer ?: return
        if (!busy.compareAndSet(false, true)) return
        val tapAt = SystemClock.elapsedRealtime()
        overlay?.setChecking()
        val masks = overlay?.captureRects().orEmpty()
        worker.execute {
            try {
                var shot = currentCapturer.capture(tapAt + FRESH_FRAME_MS, FRAME_WAIT_MS, masks)
                var path = "mask"
                if (shot is ScreenCapturer.Capture.Busy) {
                    path = "fade"
                    val fadedBy = onMain { overlay?.fadeForCapture() } ?: SystemClock.elapsedRealtime()
                    shot = currentCapturer.capture(fadedBy + FRAME_AFTER_FADE_MS, FADE_FRAME_WAIT_MS, emptyList()) {
                        main.post { overlay?.afterCapture() }
                    }
                } else {
                    main.post { overlay?.afterCapture() }
                }
                val jpeg = (shot as? ScreenCapturer.Capture.Jpeg)
                    ?: throw CheckException("Could not read the screen. Tap the shield to try again.")
                Log.i(
                    TAG,
                    "capture path=$path tap_to_jpeg_ms=${SystemClock.elapsedRealtime() - tapAt} crop=${jpeg.crop.toShortString()} " +
                        "frame_wait_ms=${jpeg.frameWaitMs} encode_ms=${jpeg.encodeMs}" + if (path == "mask") " bubble hidden_ms=0" else ""
                )
                val result = withFailover { url, connectMs ->
                    CheckClient.checkScreen(url, language, jpeg.bytes, ShieldBridge.authToken, ShieldBridge.shareSignals, connectMs)
                }
                main.post { onResult(result, jpeg.thumb) }
            } catch (e: CheckException) {
                main.post { onFailure(e.message ?: "The check failed.") }
            } catch (e: InterruptedException) {
                main.post { onFailure("The check was cancelled.") }
            } catch (e: Throwable) {
                main.post { onFailure("The check failed. Try again.") }
            }
        }
    }

    /** Makes [url] the primary for the rest of the session and keeps the old primary as the fallback. */
    private fun switchTo(url: String) {
        val old = apiUrl
        apiUrl = url
        fallbackApiUrl = old
    }

    /** Runs [call] on the primary with a short connect timeout, then once on the fallback if the primary is unreachable. */
    private fun <T> withFailover(call: (url: String, connectMs: Int) -> T): T {
        val first = apiUrl
        val alt = fallbackApiUrl
        if (alt.isBlank() || alt == first) return call(first, CheckClient.CONNECT_TIMEOUT_MS)
        return try {
            call(first, CheckClient.FAST_CONNECT_TIMEOUT_MS)
        } catch (e: UnreachableException) {
            call(alt, CheckClient.CONNECT_TIMEOUT_MS).also { switchTo(alt) }
        }
    }

    /** Runs [block] on the main thread and waits up to 500 ms for its value. */
    private fun <T> onMain(block: () -> T?): T? {
        val latch = java.util.concurrent.CountDownLatch(1)
        var value: T? = null
        main.post {
            value = block()
            latch.countDown()
        }
        latch.await(500, java.util.concurrent.TimeUnit.MILLISECONDS)
        return value
    }

    private fun onResult(result: JSONObject, preview: android.graphics.Bitmap? = null) {
        val id = result.optString("id").ifBlank { "chk_local_${System.currentTimeMillis()}" }
        val json = result.toString()
        lastId = id
        lastJson = json
        busy.set(false)
        overlay?.setResult(result, preview)
        ShieldBridge.publishResult(id, json)
        pendingCheck?.let {
            pendingCheck = null
            it(result, null)
        }
    }

    private fun onFailure(message: String) {
        busy.set(false)
        failCheck(message)
    }

    private fun failCheck(message: String) {
        lastCheckError = message
        overlay?.setError(message)
        pendingCheck?.let {
            pendingCheck = null
            it(null, message)
        }
    }

    // ---- voice companion ----

    private val companionHost = object : CompanionHost {
        override fun runCheck(onDone: (JSONObject?, String?) -> Unit) {
            if (busy.get() || awaitingConsent) {
                onDone(null, "busy")
                return
            }
            pendingCheck = onDone
            checkNow()
        }

        override fun fetchWarning(text: String, onDone: (ByteArray?) -> Unit) {
            val lang = language
            val token = ShieldBridge.authToken
            try {
                worker.execute {
                    val first = apiUrl
                    val alt = fallbackApiUrl
                    var wav = SpeakClient.speak(first, text, lang, token)
                    if (wav == null && alt.isNotBlank() && alt != first) {
                        wav = SpeakClient.speak(alt, text, lang, token)
                        if (wav != null) switchTo(alt)
                    }
                    main.post { onDone(wav) }
                }
            } catch (e: Exception) {
                main.post { onDone(null) }
            }
        }

        override fun openSocket(listener: CompanionSocketListener): CompanionSocket {
            val bases = listOf(apiUrl, fallbackApiUrl).filter { it.isNotBlank() }.distinct()
            return FailoverCompanionSocket(bases.ifEmpty { listOf(apiUrl) }, listener, onOpened = { base -> if (base != apiUrl) switchTo(base) })
        }

        override fun startFields(): JSONObject = JSONObject().apply {
            put("language", language)
            ShieldBridge.homeCountry?.let { put("home", it) }
            ShieldBridge.destinationCountry?.let { put("destination", it) }
            ShieldBridge.authToken.takeIf { it.isNotBlank() }?.let { put("token", it) }
        }

        override fun onAction(screen: String) {
            if (screen == "HOTLINES") openLink("saferoute://help") else onOpenReport()
        }
    }

    private fun startCompanion() {
        val o = overlay ?: return
        if (companion?.isActive == true || busy.get() || awaitingConsent) return
        if (!hasMic()) {
            o.showNotice(ShieldBridge.strings.micDenied, opensApp = true)
            return
        }
        if (!enableVoiceForeground()) {
            o.showNotice(ShieldBridge.strings.needsForeground, opensApp = true)
            return
        }
        val existing = if (o.state in RESULT_STATES) lastJson?.let { JSONObject(it) } else null
        o.closeNotice()
        lateinit var session: CompanionSession
        val audio = CompanionAudioEngine(this) { event -> main.post { if (companion === session) session.onFocus(event) } }
        session = CompanionSession(companionHost, audio, { view -> onCompanionChange(session, view) }, main)
        companion = session
        o.levelSource = {
            val s = session.view.state
            if (s == CompanionState.SPEAKING || s == CompanionState.WARNING) audio.outputLevel() else audio.inputLevel()
        }
        session.start(existing)
    }

    private fun onCompanionChange(session: CompanionSession, view: CompanionView) {
        if (companion !== session) return
        val o = overlay ?: return
        if (view.state != CompanionState.ENDED) {
            o.showCompanion(view)
            return
        }
        companion = null
        pendingCheck = null
        o.levelSource = null
        val strings = ShieldBridge.strings
        when {
            view.endedBy == EndReason.CAP -> o.endCompanion(strings.endedCap)
            view.endedBy == EndReason.ERROR && view.error == "check_failed" ->
                o.endCompanion(lastCheckError?.let { strings.errorText(it) } ?: strings.error(null))
            view.endedBy == EndReason.ERROR ->
                o.endCompanion(strings.error(view.error), opensApp = view.error == "needs_foreground" || view.error == "mic_denied")
            else -> o.endCompanion()
        }
    }

    private fun hasMic(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

    /** Adds the microphone type while Kakwe is visible, so a later session from the bubble is allowed. */
    fun armVoice() {
        main.post {
            if (!started || micTyped || !hasMic() || Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return@post
            micTyped = true
            if (!promote()) micTyped = false
        }
    }

    /** True when the service runs with the microphone type. On Android 14 this can throw from the background. */
    private fun enableVoiceForeground(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R || micTyped) return true
        micTyped = true
        if (promote()) return true
        micTyped = false
        return false
    }

    override fun onBallDoubleTap() = startCompanion()

    override fun onAsk() = startCompanion()

    override fun onEndCompanion() {
        companion?.end(EndReason.USER)
    }

    override fun onLongPressBubble(): Boolean {
        val session = companion ?: return false
        session.end(EndReason.USER)
        return true
    }

    override fun onOpenApp() = openLink("saferoute://shield")

    private fun openLink(uri: String) {
        val view = Intent(Intent.ACTION_VIEW, Uri.parse(uri))
            .setPackage(packageName)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        try {
            startActivity(view)
        } catch (e: Exception) {
            packageManager.getLaunchIntentForPackage(packageName)?.let {
                runCatching { startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
            }
        }
    }

    override fun onBallTap() {
        companion?.let {
            if (it.isActive) {
                it.toggleMute()
                return
            }
        }
        val o = overlay ?: return
        when (o.state) {
            ShieldOverlay.State.SAFE,
            ShieldOverlay.State.CAREFUL,
            ShieldOverlay.State.DANGER -> o.toggleCard()
            ShieldOverlay.State.CHECKING -> Unit
            else -> checkNow()
        }
    }

    override fun onOpenReport() {
        val id = lastId ?: return
        val json = lastJson ?: return
        val view = Intent(Intent.ACTION_VIEW, Uri.parse("saferoute://report/" + Uri.encode(id)))
            .setPackage(packageName)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra(ShieldBridge.EXTRA_RESULT_JSON, json)
        try {
            startActivity(view)
        } catch (e: ActivityNotFoundException) {
            val launch = packageManager.getLaunchIntentForPackage(packageName)
            if (launch != null) {
                startActivity(
                    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK).putExtra(ShieldBridge.EXTRA_RESULT_JSON, json)
                )
            }
        }
        if (companion == null) overlay?.reset()
    }

    override fun onDismiss() {
        overlay?.reset()
    }

    override fun onClose() = stopNow()

    /** Removes the bubble and reports the shield stopped at once; onDestroy finishes the teardown. */
    fun stopNow() {
        overlay?.remove()
        overlay = null
        markStopped()
        companion?.end(EndReason.SHIELD)
        companion = null
        stopSelf()
    }

    private fun markStopped() {
        if (!started) return
        started = false
        isRunning = false
        ShieldBridge.publishRunning(false)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        overlay?.refreshTheme()
    }

    private fun promoteToForeground(withProjection: Boolean) {
        projectionTyped = withProjection || projectionTyped
        if (promote()) return
        if (micTyped) {
            micTyped = false
            if (promote()) return
        }
        ServiceCompat.startForeground(this, NOTIFICATION_ID, buildNotification(), foregroundType())
    }

    private fun foregroundType(): Int {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return 0
        var type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && !projectionTyped) {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
        } else {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
        }
        if (micTyped && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) type = type or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
        return type
    }

    /** startForeground with the current types. Android 14 throws when a while-in-use type is not allowed now. */
    private fun promote(): Boolean = try {
        ServiceCompat.startForeground(this, NOTIFICATION_ID, buildNotification(), foregroundType())
        true
    } catch (e: Exception) {
        false
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                ShieldBridge.strings.appName,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = ShieldNotification.channelDescription(ShieldBridge.strings.appName)
                lockscreenVisibility = Notification.VISIBILITY_PRIVATE
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val launch = packageManager.getLaunchIntentForPackage(packageName)?.let {
            PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        }
        return ShieldNotification.build(this, CHANNEL_ID, launch, ShieldBridge.strings.appName)
    }

    override fun onDestroy() {
        super.onDestroy()
        overlay?.remove()
        overlay = null
        markStopped()
        companion?.end(EndReason.SHIELD)
        companion = null
        pendingCheck = null
        worker.shutdownNow()
        capturer?.release()
        capturer = null
        if (instance === this) instance = null
    }

    companion object {
        const val CHANNEL_ID = "ShieldProtectionChannel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "com.saferoute.shield.START"
        const val ACTION_STOP = "com.saferoute.shield.STOP"
        const val EXTRA_API_URL = "apiUrl"
        const val EXTRA_FALLBACK_API_URL = "fallbackApiUrl"
        const val EXTRA_LANGUAGE = "language"
        private const val TAG = "ShieldCapture"
        /** A frame two vsyncs after the tap no longer shows the dismissed result card. */
        private const val FRESH_FRAME_MS = 34L
        private const val FRAME_WAIT_MS = 200L
        private const val FRAME_AFTER_FADE_MS = 17L
        private const val FADE_FRAME_WAIT_MS = 150L
        private val RESULT_STATES = setOf(ShieldOverlay.State.SAFE, ShieldOverlay.State.CAREFUL, ShieldOverlay.State.DANGER)

        @Volatile var instance: ShieldService? = null
            private set
        @Volatile var isRunning = false
            private set

        /** Opens a capture from a consent result, or null when the system refuses it. Tests replace it. */
        internal var openCapture: (ShieldService, ShieldBridge.Consent, () -> Unit) -> ScreenSource? = { service, consent, onStopped ->
            val manager = service.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            manager.getMediaProjection(consent.resultCode, consent.data)?.let { ScreenCapturer(service, it, onStopped) }
        }
    }
}
