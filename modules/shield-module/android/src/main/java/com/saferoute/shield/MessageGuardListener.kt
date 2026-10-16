package com.saferoute.shield

import android.app.Notification
import android.content.ComponentName
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
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

    override fun onListenerConnected() {
        super.onListenerConnected()
        connected = true
    }

    override fun onListenerDisconnected() {
        connected = false
        super.onListenerDisconnected()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val pkg = sbn.packageName ?: return
        val enabled = store.enabled
        if (!enabled && !store.paused) return
        val sms = MessageApps.defaultSmsPackage(applicationContext)
        val appId = MessageApps.idFor(pkg, sms) ?: return
        val notification = sbn.notification ?: return
        if (!enabled) {
            record(appId, MessageGuardActivity.SKIPPED_PAUSED)
            return
        }
        if (pkg !in MessageApps.watchedPackages(sms, store.enabledApps)) {
            record(appId, MessageGuardActivity.SKIPPED_APP_NOT_CHOSEN)
            return
        }
        if (notification.flags and (Notification.FLAG_ONGOING_EVENT or Notification.FLAG_FOREGROUND_SERVICE) != 0) {
            count(MessageGuardActivity.SKIPPED_ONGOING)
            return
        }
        if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0 && hasChildren(sbn)) {
            count(MessageGuardActivity.SKIPPED_SUMMARY)
            return
        }
        when (val read = MessageGuardExtractor.read(notification)) {
            is MessageGuardExtractor.Read.Skip -> record(appId, read.outcome)
            is MessageGuardExtractor.Read.Message -> worker.execute { process(pkg, appId, read.message) }
        }
    }

    /** A group summary repeats its children, so it is read only when the app posted no child. */
    private fun hasChildren(sbn: StatusBarNotification): Boolean {
        val group = sbn.groupKey ?: return false
        val active = try {
            activeNotifications
        } catch (_: Exception) {
            return true
        } ?: return true
        return active.any {
            it.packageName == sbn.packageName && it.groupKey == group && it.key != sbn.key &&
                (it.notification?.flags ?: 0) and Notification.FLAG_GROUP_SUMMARY == 0
        }
    }

    private fun record(appId: String, outcome: String) {
        worker.execute { store.activity.record(appId, outcome) }
    }

    private fun count(outcome: String) {
        worker.execute { store.activity.count(outcome) }
    }

    private fun process(pkg: String, appId: String, message: MessageGuardExtractor.Extracted) {
        if (!store.enabled) {
            store.activity.record(appId, MessageGuardActivity.SKIPPED_PAUSED)
            return
        }
        val decision = engine.prepare(message.text, message.sender, message.names)
        if (decision is MessageGuardEngine.Decision.Skip) {
            if (decision.reason == MessageGuardEngine.SKIP_DAILY) store.pause(MessageGuardStore.PAUSE_DAILY)
            store.activity.record(appId, MessageGuardActivity.forSkip(decision.reason))
            return
        }
        val send = decision as MessageGuardEngine.Decision.Send
        val seq = store.activity.record(appId, MessageGuardActivity.SENT)
        val logId = store.log.add(MessageApps.labelFor(applicationContext, pkg), send.text)
        try {
            val result = MessageCheckClient.check(
                store.apiUrl, store.language, send.text, store.shareSignals, ShieldBridge.authToken,
            )
            val verdict = result.optString("verdict")
            store.log.setVerdict(logId, verdict.ifBlank { MessageGuardLog.FAILED })
            val id = result.optString("id").ifBlank { "chk_msg_${System.currentTimeMillis()}" }
            result.put("id", id)
            if (MessageGuardNotifier.stateFor(verdict) == null) {
                store.activity.update(seq, MessageGuardActivity.result(verdict))
                return
            }
            val json = result.toString()
            store.saveResult(id, json)
            ShieldBridge.publishResult(id, json)
            val shown = MessageGuardNotifier.post(applicationContext, result, store.noticeBody, store.noticeOpen)
            store.activity.update(seq, MessageGuardActivity.result(verdict, shown))
        } catch (e: Exception) {
            store.log.setVerdict(logId, MessageGuardLog.FAILED)
            store.activity.update(seq, MessageGuardActivity.checkFailed((e as? CheckException)?.kind ?: "unknown"))
        }
    }

    override fun onDestroy() {
        connected = false
        worker.shutdownNow()
        super.onDestroy()
    }

    companion object {
        /** True while Android has this listener bound. Same process as the app, so the app can read it. */
        @Volatile
        var connected: Boolean = false
            private set

        fun rebind(context: android.content.Context) {
            try {
                NotificationListenerService.requestRebind(ComponentName(context, MessageGuardListener::class.java))
            } catch (_: Exception) {
            }
        }
    }
}
