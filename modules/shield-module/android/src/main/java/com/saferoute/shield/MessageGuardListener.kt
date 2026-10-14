package com.saferoute.shield

import android.content.ComponentName
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.app.Notification
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Reads notifications only from the allowlisted messaging apps, and only while Message Guard is on.
 * Notifications from every other app are dropped before any content is read.
 */
class MessageGuardListener : NotificationListenerService() {

    private lateinit var store: MessageGuardStore
    private lateinit var engine: MessageGuardEngine
    private val worker: ExecutorService = Executors.newSingleThreadExecutor()

    override fun onCreate() {
        super.onCreate()
        store = MessageGuardStore(this)
        engine = MessageGuardEngine(
            GuardKeywords.load(this),
            MessageGuardLimiter(System::currentTimeMillis, store::loadStamps, store::saveStamps),
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null || !store.enabled) return
        if (!MessageApps.isWatched(applicationContext, sbn.packageName, store.enabledApps)) return
        val notification = sbn.notification ?: return
        val skip = Notification.FLAG_GROUP_SUMMARY or Notification.FLAG_ONGOING_EVENT
        if (notification.flags and skip != 0) return
        val extracted = MessageGuardExtractor.extract(notification) ?: return
        worker.execute { process(extracted) }
    }

    private fun process(message: MessageGuardExtractor.Extracted) {
        try {
            val decision = engine.prepare(message.text, message.sender)
            if (decision !is MessageGuardEngine.Decision.Send) return
            val result = MessageCheckClient.check(
                store.apiUrl, store.language, decision.text, store.shareSignals, ShieldBridge.authToken,
            )
            val id = result.optString("id").ifBlank { "chk_msg_${System.currentTimeMillis()}" }
            result.put("id", id)
            if (MessageGuardNotifier.stateFor(result.optString("verdict")) == null) return
            val json = result.toString()
            store.saveResult(id, json)
            ShieldBridge.publishResult(id, json)
            MessageGuardNotifier.post(applicationContext, result)
        } catch (_: Exception) {
            // A failed check shows nothing.
        }
    }

    override fun onDestroy() {
        worker.shutdownNow()
        super.onDestroy()
    }

    companion object {
        fun rebind(context: android.content.Context) {
            try {
                NotificationListenerService.requestRebind(ComponentName(context, MessageGuardListener::class.java))
            } catch (_: Exception) {
            }
        }
    }
}
