package com.saferoute.shield

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.content.pm.ServiceInfo
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import org.json.JSONObject
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class ShieldService : Service(), ShieldOverlay.Listener {

    private val main = Handler(Looper.getMainLooper())
    private val worker: ExecutorService = Executors.newSingleThreadExecutor()
    private val busy = AtomicBoolean(false)
    private var overlay: ShieldOverlay? = null
    private var capturer: ScreenCapturer? = null
    private var started = false
    private var awaitingConsent = false
    private var apiUrl = ""
    private var language = "en"
    private var lastId: String? = null
    private var lastJson: String? = null

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
        intent?.getStringExtra(EXTRA_LANGUAGE)?.let { if (it.isNotBlank()) language = it }
        if (!started) {
            started = true
            createNotificationChannel()
            promoteToForeground(withProjection = false)
            overlay = ShieldOverlay(this, this).also { it.show() }
            isRunning = true
            if (ShieldBridge.pendingConsent != null) onConsentGranted()
        }
        return START_NOT_STICKY
    }

    fun hasProjection(): Boolean = capturer != null

    fun onConsentGranted() {
        main.post {
            val consent = ShieldBridge.pendingConsent
            if (consent == null || !started) return@post
            ShieldBridge.pendingConsent = null
            try {
                promoteToForeground(withProjection = true)
                val manager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
                val projection = manager.getMediaProjection(consent.resultCode, consent.data)
                capturer?.release()
                capturer = ScreenCapturer(this, projection) {
                    main.post { capturer = null }
                }
            } catch (e: Exception) {
                capturer = null
                awaitingConsent = false
                overlay?.setError("Screen capture could not start. Tap the shield to try again.")
                return@post
            }
            if (awaitingConsent) {
                awaitingConsent = false
                startCheck()
            }
        }
    }

    fun onConsentDenied() {
        main.post {
            if (!awaitingConsent) return@post
            awaitingConsent = false
            overlay?.setError("Screen capture was not allowed. Tap the shield to try again.")
        }
    }

    fun requestCheck() {
        main.post { checkNow() }
    }

    private fun checkNow() {
        if (busy.get() || awaitingConsent) return
        if (capturer == null) {
            if (ShieldBridge.pendingConsent != null) {
                awaitingConsent = true
                onConsentGranted()
                return
            }
            awaitingConsent = true
            overlay?.reset()
            val intent = Intent(this, ConsentActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try {
                startActivity(intent)
            } catch (e: Exception) {
                awaitingConsent = false
                overlay?.setError("Could not ask for screen capture permission.")
            }
            return
        }
        startCheck()
    }

    private fun startCheck() {
        val currentCapturer = capturer ?: return
        if (!busy.compareAndSet(false, true)) return
        val hiddenAt = SystemClock.elapsedRealtime()
        overlay?.hideForCapture()
        worker.execute {
            try {
                Thread.sleep(HIDE_SETTLE_MS)
                val jpeg = currentCapturer.captureJpeg(hiddenAt + FRAME_AFTER_HIDE_MS, FRAME_WAIT_MS)
                    ?: throw CheckException("Could not read the screen. Tap the shield to try again.")
                main.post { overlay?.setChecking() }
                val result = CheckClient.checkScreen(apiUrl, language, jpeg, ShieldBridge.authToken)
                main.post { onResult(result) }
            } catch (e: CheckException) {
                main.post { onFailure(e.message ?: "The check failed.") }
            } catch (e: InterruptedException) {
                main.post { onFailure("The check was cancelled.") }
            } catch (e: Throwable) {
                main.post { onFailure("The check failed. Try again.") }
            }
        }
    }

    private fun onResult(result: JSONObject) {
        val id = result.optString("id").ifBlank { "chk_local_${System.currentTimeMillis()}" }
        val json = result.toString()
        lastId = id
        lastJson = json
        busy.set(false)
        overlay?.setResult(result)
        ShieldBridge.publishResult(id, json)
    }

    private fun onFailure(message: String) {
        busy.set(false)
        overlay?.setError(message)
    }

    override fun onBallTap() {
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
        overlay?.reset()
    }

    override fun onDismiss() {
        overlay?.reset()
    }

    override fun onClose() {
        stopSelf()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        overlay?.refreshTheme()
    }

    private fun promoteToForeground(withProjection: Boolean) {
        val type = when {
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE ->
                if (withProjection) ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
                else ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q -> ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            else -> 0
        }
        ServiceCompat.startForeground(this, NOTIFICATION_ID, buildNotification(), type)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "SafeRoute Shield",
                NotificationManager.IMPORTANCE_LOW
            ).apply { description = "Shows while the SafeRoute shield button is on" }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SafeRoute Shield is on")
            .setContentText("Tap the floating shield to check what is on your screen.")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
        packageManager.getLaunchIntentForPackage(packageName)?.let { launch ->
            builder.setContentIntent(
                PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            )
        }
        return builder.build()
    }

    override fun onDestroy() {
        super.onDestroy()
        worker.shutdownNow()
        overlay?.remove()
        overlay = null
        capturer?.release()
        capturer = null
        instance = null
        isRunning = false
        started = false
    }

    companion object {
        const val CHANNEL_ID = "ShieldProtectionChannel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "com.saferoute.shield.START"
        const val ACTION_STOP = "com.saferoute.shield.STOP"
        const val EXTRA_API_URL = "apiUrl"
        const val EXTRA_LANGUAGE = "language"
        private const val HIDE_SETTLE_MS = 250L
        private const val FRAME_AFTER_HIDE_MS = 100L
        private const val FRAME_WAIT_MS = 600L

        @Volatile var instance: ShieldService? = null
            private set
        @Volatile var isRunning = false
            private set
    }
}
