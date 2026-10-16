package com.saferoute.shield

import android.app.Notification
import android.content.Context
import android.os.Bundle
import android.os.Process
import android.service.notification.StatusBarNotification
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class MessageGuardActivityTest {

    private val context: Context = ApplicationProvider.getApplicationContext()

    @Before
    fun reset() {
        context.getSharedPreferences("saferoute_message_guard", Context.MODE_PRIVATE).edit().clear().commit()
        File(context.noBackupFilesDir, "message_guard").deleteRecursively()
    }

    @Test
    fun events_hold_codes_only_and_a_result_replaces_sent() {
        var t = 1_000_000L
        val activity = MessageGuardActivity(File(context.noBackupFilesDir, "message_guard/activity.json")) { t }
        activity.record("viber", MessageGuardActivity.SKIPPED_NOT_RISKY)
        val seq = activity.record("sms", MessageGuardActivity.SENT)
        activity.update(seq, MessageGuardActivity.result("careful", shown = false))
        activity.count(MessageGuardActivity.SKIPPED_SUMMARY)

        val events = activity.events()
        assertEquals(listOf("skipped_not_risky", "result:careful:notice_blocked"), events.map { it.outcome })
        assertEquals(listOf("viber", "sms"), events.map { it.app })
        assertEquals(setOf("seq", "at", "app", "label", "outcome"), events[0].toMap("Viber").keys)
        assertEquals(1, activity.counts()["skipped_summary"])
        assertEquals(1, activity.counts()["sent"])
        assertEquals(listOf(seq), activity.events(seq - 1).map { it.seq })

        val raw = File(context.noBackupFilesDir, "message_guard/activity.json").readText()
        assertFalse(raw.contains("text") || raw.contains("sender") || raw.contains("title"))

        activity.clear()
        assertTrue(activity.events().isEmpty())
        assertTrue(activity.record("viber", MessageGuardActivity.SENT) > seq)

        t += MessageGuardActivity.MAX_AGE_MS + 1
        assertNull(activity.last())
    }

    @Test
    fun skip_reasons_map_to_outcome_codes() {
        assertEquals("skipped_too_short", MessageGuardActivity.forSkip(MessagePrefilter.SKIP_SHORT))
        assertEquals("skipped_otp", MessageGuardActivity.forSkip(MessagePrefilter.SKIP_OTP))
        assertEquals("skipped_not_risky", MessageGuardActivity.forSkip(MessagePrefilter.SKIP_LOW))
        assertEquals("skipped_duplicate", MessageGuardActivity.forSkip(MessageGuardEngine.SKIP_DUPLICATE))
        assertEquals("skipped_rate_limited", MessageGuardActivity.forSkip(MessageGuardEngine.SKIP_HOURLY))
        assertEquals("skipped_rate_limited", MessageGuardActivity.forSkip(MessageGuardEngine.SKIP_DAILY))
        assertEquals("check_failed:server_503", MessageGuardActivity.checkFailed("server_503"))
        assertEquals("result:safe", MessageGuardActivity.result("safe"))
        assertEquals("result:danger", MessageGuardActivity.result("danger", shown = true))
    }

    @Test
    fun listener_records_one_outcome_per_message_app_notification() {
        MessageGuardBridge.grantConsent(context, listOf("whatsapp"))
        MessageGuardBridge.setEnabled(context, true)
        val listener = Robolectric.buildService(MessageGuardListener::class.java).create().get()

        listener.onNotificationPosted(sbn("com.android.chrome", "Breaking news: read more at www.news.com"))
        listener.onNotificationPosted(sbn("com.viber.voip", "Your parcel is held, pay the fee at http://pay-x.top/x"))
        listener.onNotificationPosted(sbn("com.whatsapp", "Hey are we still on for dinner tonight at 7?"))
        listener.onNotificationPosted(sbn("com.whatsapp", "New message"))
        listener.onNotificationPosted(sbn("com.whatsapp", "Checking for new messages", Notification.FLAG_ONGOING_EVENT))
        listener.onNotificationPosted(sbn("com.whatsapp", "Your verification code is 482913. Do not share it with anyone."))
        listener.onNotificationPosted(sbn("com.whatsapp", "URGENT: your bank account is locked. Verify now at bit.ly/3xYzAb", sender = "+95 9 123 456 789"))

        val events = waitFor(4)
        assertEquals(
            listOf(
                "whatsapp:skipped_not_risky",
                "whatsapp:skipped_hidden_preview",
                "whatsapp:skipped_otp",
                "whatsapp:check_failed:no_server",
            ),
            events.map { "${it.app}:${it.outcome}" },
        )
        val store = MessageGuardStore(context)
        assertEquals(1, store.activity.counts()["skipped_ongoing"])
        assertEquals(1, store.log.entries().size)
        val status = MessageGuardBridge.status(context)
        assertEquals("check_failed:no_server", (status["last"] as Map<*, *>)["outcome"])
        assertEquals("WhatsApp", (status["last"] as Map<*, *>)["label"])
        listener.onDestroy()
    }

    @Test
    fun an_app_the_user_did_not_choose_leaves_no_record() {
        MessageGuardBridge.grantConsent(context, listOf("whatsapp"))
        MessageGuardBridge.setEnabled(context, true)
        val listener = Robolectric.buildService(MessageGuardListener::class.java).create().get()
        for (pkg in listOf("com.viber.voip", "com.android.mms", "org.telegram.messenger", "com.android.chrome")) {
            listener.onNotificationPosted(sbn(pkg, "Your parcel is held, pay the fee at http://pay-x.top/x"))
            listener.onNotificationPosted(sbn(pkg, "New message"))
            listener.onNotificationPosted(sbn(pkg, "Syncing", Notification.FLAG_ONGOING_EVENT))
        }
        MessageGuardStore(context).pause(MessageGuardStore.PAUSE_DAILY)
        listener.onNotificationPosted(sbn("com.viber.voip", "Your parcel is held, pay the fee at http://pay-x.top/x"))
        listener.onNotificationPosted(sbn("com.whatsapp", "Your parcel is held, pay the fee at http://pay-x.top/x"))

        assertEquals(listOf("whatsapp:skipped_paused"), waitFor(1).map { "${it.app}:${it.outcome}" })
        val store = MessageGuardStore(context)
        assertEquals(mapOf("skipped_paused" to 1), store.activity.counts())
        assertTrue(store.log.entries().isEmpty())
        val raw = File(context.noBackupFilesDir, "message_guard/activity.json").readText()
        assertFalse(raw.contains("viber") || raw.contains("telegram") || raw.contains("sms"))
        listener.onDestroy()
    }

    @Test
    fun records_from_earlier_builds_about_other_apps_are_dropped() {
        val file = File(context.noBackupFilesDir, "message_guard/activity.json")
        file.parentFile!!.mkdirs()
        val now = System.currentTimeMillis()
        file.writeText(
            """{"nextSeq":2,"events":[{"seq":0,"at":$now,"app":"viber","outcome":"skipped_app_not_chosen"},""" +
                """{"seq":1,"at":$now,"app":"sms","outcome":"skipped_not_risky"}],""" +
                """"counts":{"skipped_app_not_chosen":3,"skipped_not_risky":1}}""",
        )
        val activity = MessageGuardStore(context).activity
        assertEquals(listOf("sms:skipped_not_risky"), activity.events().map { "${it.app}:${it.outcome}" })
        assertEquals(mapOf("skipped_not_risky" to 1), activity.counts())
        activity.record("sms", MessageGuardActivity.SENT)
        assertFalse(file.readText().contains("not_chosen"))
    }

    @Test
    fun listener_records_nothing_while_off() {
        val listener = Robolectric.buildService(MessageGuardListener::class.java).create().get()
        listener.onNotificationPosted(sbn("com.whatsapp", "Your parcel is held, pay the fee at http://pay-x.top/x"))
        Thread.sleep(200)
        assertTrue(MessageGuardStore(context).activity.events().isEmpty())
        listener.onDestroy()
    }

    @Test
    fun a_paused_guard_says_so_without_reading() {
        MessageGuardBridge.grantConsent(context, listOf("whatsapp"))
        MessageGuardBridge.setEnabled(context, true)
        MessageGuardStore(context).pause(MessageGuardStore.PAUSE_DAILY)
        val listener = Robolectric.buildService(MessageGuardListener::class.java).create().get()
        listener.onNotificationPosted(sbn("com.whatsapp", "Your parcel is held, pay the fee at http://pay-x.top/x"))
        assertEquals(listOf("skipped_paused"), waitFor(1).map { it.outcome })
        assertTrue(MessageGuardStore(context).log.entries().isEmpty())
        listener.onDestroy()
    }

    @Test
    fun status_reports_the_checks_the_card_needs() {
        MessageGuardBridge.grantConsent(context, listOf("whatsapp", "line"))
        MessageGuardBridge.setEnabled(context, true)
        val status = MessageGuardBridge.status(context)
        assertEquals(false, status["listenerConnected"])
        assertTrue(status["notificationsEnabled"] is Boolean)
        assertTrue(status["batteryOptimized"] is Boolean)
        assertEquals(setOf("WhatsApp", "LINE"), (status["missingApps"] as List<*>).toSet())
        assertNull(status["last"])
    }

    private fun waitFor(count: Int): List<MessageGuardActivity.Event> {
        val activity = MessageGuardStore(context).activity
        val deadline = System.currentTimeMillis() + 5_000
        while (System.currentTimeMillis() < deadline) {
            val events = activity.events()
            if (events.size >= count && events.none { it.outcome == MessageGuardActivity.SENT }) return events
            Thread.sleep(20)
        }
        return activity.events()
    }

    @Suppress("DEPRECATION")
    private fun sbn(pkg: String, text: String, flags: Int = 0, sender: String = "Mom"): StatusBarNotification {
        val n = Notification()
        n.flags = flags
        n.extras = Bundle().apply {
            putCharSequence(Notification.EXTRA_TITLE, sender)
            putCharSequence(Notification.EXTRA_TEXT, text)
        }
        return StatusBarNotification(pkg, pkg, 1, null, 0, 0, 0, n, Process.myUserHandle(), System.currentTimeMillis())
    }
}
