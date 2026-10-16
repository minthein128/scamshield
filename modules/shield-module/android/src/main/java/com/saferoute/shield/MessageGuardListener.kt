package com.saferoute.shield

import android.content.ComponentName
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.app.Notification
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Reads notifications only from the messaging apps the user chose, and only while Message Guard is on
 * with consent. Notifications from every other app are dropped before any content is read.
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
        val pkg = sbn.packageName ?: return
        if (!MessageApps.isWatched(applicationContext, pkg, store.enabledApps)) return
        val notification = sbn.notification ?: return
        val skip = Notification.FLAG_GROUP_SUMMARY or Notification.FLAG_ONGOING_EVENT
        if (notification.flags and skip != 0) return
        val extracted = MessageGuardExtractor.extract(notification) ?: return
        worker.execute { process(pkg, extracted) }
    }

    private fun process(pkg: String, message: MessageGuardExtractor.Extracted) {
        if (!store.enabled) return
        val decision = engine.prepare(message.text, message.sender, message.names)
        if (decision is MessageGuardEngine.Decision.Skip) {
            if (decision.reason == MessageGuardEngine.SKIP_DAILY) store.pause(MessageGuardStore.PAUSE_DAILY)
            return
        }
        val send = decision as MessageGuardEngine.Decision.Send
        val logId = store.log.add(MessageApps.labelFor(applicationContext, pkg), send.text)
        try {
            val result = MessageCheckClient.check(
                store.apiUrl, store.language, send.text, store.shareSignals, ShieldBridge.authToken,
            )
            val verdict = result.optString("verdict")
            store.log.setVerdict(logId, verdict.ifBlank { MessageGuardLog.FAILED })
            val id = result.optString("id").ifBlank { "chk_msg_${System.currentTimeMillis()}" }
            result.put("id", id)
            if (MessageGuardNotifier.stateFor(verdict) == null) return
            val json = result.toString()
            store.saveResult(id, json)
            ShieldBridge.publishResult(id, json)
            MessageGuardNotifier.post(applicationContext, result, store.noticeBody, store.noticeOpen)
        } catch (_: Exception) {
            store.log.setVerdict(logId, MessageGuardLog.FAILED)
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
