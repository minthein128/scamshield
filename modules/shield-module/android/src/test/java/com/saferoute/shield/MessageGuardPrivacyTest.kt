package com.saferoute.shield

import android.app.Notification
import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.test.core.app.ApplicationProvider
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import java.io.File

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class MessageGuardPrivacyTest {

    private val context: Context = ApplicationProvider.getApplicationContext()

    @Before
    fun reset() {
        context.getSharedPreferences("saferoute_message_guard", Context.MODE_PRIVATE).edit().clear().commit()
        File(context.noBackupFilesDir, "message_guard").deleteRecursively()
    }

    @Test
    fun off_by_default_with_no_apps() {
        val store = MessageGuardStore(context)
        assertFalse(store.enabled)
        assertFalse(store.hasConsent)
        assertTrue(store.enabledApps.isEmpty())
        assertTrue(MessageApps.watchedPackages("com.samsung.android.messaging", store.enabledApps).isEmpty())
    }

    @Test
    fun signal_sharing_is_off_until_the_app_passes_the_opt_in() {
        val store = MessageGuardStore(context)
        assertFalse(store.shareSignals)
        MessageGuardBridge.configure(context, mapOf("apiUrl" to "https://api.example.org", "language" to "my"))
        assertFalse(MessageGuardStore(context).shareSignals)
        MessageGuardBridge.configure(context, mapOf("shareSignals" to true))
        assertTrue(MessageGuardStore(context).shareSignals)
        MessageGuardBridge.configure(context, mapOf("shareSignals" to false))
        assertFalse(MessageGuardStore(context).shareSignals)
    }

    @Test
    fun cannot_turn_on_without_consent() {
        val store = MessageGuardStore(context)
        assertFalse(store.turnOn())
        assertFalse(store.enabled)
        assertFalse(MessageGuardBridge.setEnabled(context, true))
        assertFalse(MessageGuardBridge.grantConsent(context, emptyList()))
        assertFalse(MessageGuardBridge.grantConsent(context, listOf("gmail", "bank")))
        assertFalse(MessageGuardBridge.setEnabled(context, true))
    }

    @Test
    fun consent_covers_only_the_chosen_apps() {
        assertTrue(MessageGuardBridge.grantConsent(context, listOf("sms", "gmail")))
        assertTrue(MessageGuardBridge.setEnabled(context, true))
        val store = MessageGuardStore(context)
        assertTrue(store.enabled)
        assertEquals(setOf("sms"), store.enabledApps)

        store.keepApps(listOf("sms", "whatsapp"))
        assertEquals("adding an app needs new consent", setOf("sms"), store.enabledApps)
        store.grantConsent(listOf("sms", "whatsapp"))
        assertEquals(setOf("sms", "whatsapp"), store.enabledApps)
        store.keepApps(listOf("whatsapp"))
        assertEquals(setOf("whatsapp"), store.enabledApps)
    }

    @Test
    fun turning_off_withdraws_consent() {
        MessageGuardBridge.grantConsent(context, listOf("whatsapp"))
        MessageGuardBridge.setEnabled(context, true)
        MessageGuardBridge.setEnabled(context, false)
        val store = MessageGuardStore(context)
        assertFalse(store.enabled)
        assertFalse(store.hasConsent)
        assertTrue(store.enabledApps.isEmpty())
        assertFalse(store.turnOn())
    }

    @Test
    fun older_installs_without_consent_stay_off() {
        context.getSharedPreferences("saferoute_message_guard", Context.MODE_PRIVATE).edit()
            .putBoolean("enabled", true)
            .putString("results", "[]")
            .commit()
        val store = MessageGuardStore(context)
        assertFalse(store.enabled)
        assertTrue(store.enabledApps.isEmpty())
        assertFalse(context.getSharedPreferences("saferoute_message_guard", Context.MODE_PRIVATE).contains("results"))
    }

    @Test
    fun app_list_has_nothing_on_and_sms_first() {
        val rows = MessageApps.rows("com.samsung.android.messaging", "Messages", emptySet())
        assertTrue(rows.none { it.enabled })
        assertEquals(MessageApps.SMS_ID, rows.first().id)
        assertEquals("Messages (SMS)", rows.first().label)
        assertTrue(rows.first().recommended)
        assertEquals(1, rows.count { it.recommended })

        val google = MessageApps.rows("com.google.android.apps.messaging", null, emptySet())
        assertEquals("messages", google.first().id)
        assertTrue(google.first().recommended)
        assertEquals(MessageApps.catalog.size, google.size)
        assertTrue(google.none { it.enabled })

        assertTrue(MessageApps.rows(null, null, emptySet()).none { it.recommended || it.enabled })
    }

    @Test
    fun catalog_holds_chat_and_sms_apps_only() {
        assertEquals(
            setOf("messages", "whatsapp", "viber", "telegram", "line", "messenger", "zalo", "signal"),
            MessageApps.catalog.map { it.id }.toSet(),
        )
        val packages = MessageApps.catalog.flatMap { it.packages }
        val email = listOf("com.google.android.gm", "com.microsoft.office.outlook", "com.samsung.android.email.provider", "com.yahoo.mobile.client.android.mail")
        val banking = listOf("com.kasikorn", "com.scb", "com.bca", "com.gcash", "mm.com.kbzbank", "com.wavemoney", "com.maybank", "ph.com.bdo", "com.bpi")
        for (p in packages) {
            assertFalse(p, p in email)
            assertFalse(p, banking.any { p.startsWith(it) })
            assertFalse(p, p.contains("mail") || p.contains("bank") || p.contains("pay") || p.contains("wallet"))
        }
    }

    @Test
    fun log_keeps_the_last_50_and_only_seven_days() {
        var t = 1_000_000_000_000L
        val log = MessageGuardLog(File(context.noBackupFilesDir, "message_guard/test_log.json")) { t }
        for (i in 1..60) {
            val id = log.add("WhatsApp", "text $i")
            log.setVerdict(id, "careful")
            t += 1000
        }
        val entries = log.entries()
        assertEquals(50, entries.size)
        assertEquals("text 60", entries.first().text)
        assertEquals("text 11", entries.last().text)
        assertEquals("careful", entries.first().verdict)

        t += 7 * 24 * 60 * 60 * 1000L - 31_000
        assertEquals(30, log.entries().size)
        t += 60_000
        assertTrue(log.entries().isEmpty())

        log.add("SMS", "again")
        log.clear()
        assertTrue(log.entries().isEmpty())
    }

    @Test
    fun log_lives_in_the_no_backup_directory_and_records_the_sent_text() {
        val store = MessageGuardStore(context)
        val id = store.log.add("Viber", "Pay at http://x.top/[PATH] now [PHONE]")
        store.log.setVerdict(id, "danger")
        val file = File(context.noBackupFilesDir, "message_guard/sent_log.json")
        assertTrue(file.exists())
        val entry = MessageGuardBridge.log(context).single()
        assertEquals("Viber", entry["app"])
        assertEquals("Pay at http://x.top/[PATH] now [PHONE]", entry["text"])
        assertEquals("danger", entry["verdict"])
        assertTrue(MessageGuardBridge.clearLog(context))
        assertTrue(MessageGuardBridge.log(context).isEmpty())
        assertFalse(file.exists())
    }

    @Test
    fun results_are_kept_outside_backed_up_preferences() {
        val store = MessageGuardStore(context)
        store.saveResult("chk_1", """{"id":"chk_1","verdict":"danger"}""")
        assertEquals("""{"id":"chk_1","verdict":"danger"}""", MessageGuardStore(context).result("chk_1"))
        val prefs = context.getSharedPreferences("saferoute_message_guard", Context.MODE_PRIVATE).all
        assertTrue(prefs.values.none { it.toString().contains("chk_1") })
    }

    @Test
    fun notice_is_neutral_and_private() {
        val result = JSONObject()
            .put("id", "chk_9")
            .put("verdict", "danger")
            .put("title", "This looks like a job scam")
            .put("summary", "Trafficking risk: they ask for a fee before work")
            .put("flags", org.json.JSONArray().put(JSONObject().put("evidence", "Send 5,000 baht")))
        val n = MessageGuardNotifier.build(context, result)
        assertNotNull(n)
        n!!
        val title = n.extras.getCharSequence(Notification.EXTRA_TITLE).toString()
        val text = n.extras.getCharSequence(Notification.EXTRA_TEXT).toString()
        val big = n.extras.getCharSequence(Notification.EXTRA_BIG_TEXT).toString()
        assertEquals("SafeRoute", title)
        assertEquals("A message may need a second look. Open to see why.", text)
        assertEquals(text, big)
        assertNull(n.extras.getCharSequence(Notification.EXTRA_SUB_TEXT))
        val shown = listOf(title, text, big, n.actions?.joinToString { it.title.toString() }.orEmpty()).joinToString(" ").lowercase()
        for (word in listOf("scam", "trafficking", "risk", "danger", "careful", "warning", "fraud", "job", "fee", "baht", "5,000")) {
            assertFalse(word, shown.contains(word))
        }
        assertEquals(NotificationCompat.VISIBILITY_PRIVATE, n.visibility)
        val public = n.publicVersion
        assertNotNull(public)
        assertEquals("SafeRoute", public!!.extras.getCharSequence(Notification.EXTRA_TITLE).toString())
        assertNull(public.extras.getCharSequence(Notification.EXTRA_TEXT))

        val intent = shadowOf(n.contentIntent).savedIntent
        assertEquals("saferoute://report/chk_9", intent.data.toString())
        assertEquals(context.packageName, intent.`package`)
    }

    @Test
    fun notice_uses_the_app_language_text_and_skips_safe_results() {
        val result = JSONObject().put("id", "chk_2").put("verdict", "careful")
        val n = MessageGuardNotifier.build(context, result, "Pesan ini mungkin perlu dicek lagi.", "Buka")!!
        assertEquals("SafeRoute", n.extras.getCharSequence(Notification.EXTRA_TITLE).toString())
        assertEquals("Pesan ini mungkin perlu dicek lagi.", n.extras.getCharSequence(Notification.EXTRA_TEXT).toString())
        assertEquals("Buka", n.actions.single().title.toString())
        assertNull(MessageGuardNotifier.build(context, JSONObject().put("id", "chk_3").put("verdict", "safe")))
    }

    @Test
    fun daily_cap_is_60_and_hourly_cap_is_20() {
        var t = 10_000_000_000L
        var stamps: List<Long> = emptyList()
        val limiter = MessageGuardLimiter({ t }, { stamps }, { stamps = it })
        var ok = 0
        repeat(3) {
            repeat(25) {
                when (limiter.tryAcquire()) {
                    MessageGuardLimiter.Slot.OK -> ok++
                    MessageGuardLimiter.Slot.HOUR_FULL -> Unit
                    MessageGuardLimiter.Slot.DAY_FULL -> assertEquals("day full too early", 60, ok)
                }
                t += 1000
            }
            t += 61 * 60 * 1000L
        }
        assertEquals(60, ok)
        assertEquals(MessageGuardLimiter.Slot.DAY_FULL, limiter.tryAcquire())
        assertEquals(60, stamps.size)
        t += 24 * 60 * 60 * 1000L
        assertEquals(MessageGuardLimiter.Slot.OK, limiter.tryAcquire())
    }

    @Test
    fun engine_reports_the_daily_cap_and_the_store_pauses() {
        var t = 10_000_000_000L
        var stamps: List<Long> = List(60) { t - 3 * 60 * 60 * 1000L + it }
        val engine = MessageGuardEngine(GuardKeywords.load(context), MessageGuardLimiter({ t }, { stamps }, { stamps = it }))
        val d = engine.prepare("Your parcel is held, pay the fee at http://pay-x.top/x within 24 hours", "+1 555 000 1111")
        assertEquals(MessageGuardEngine.SKIP_DAILY, (d as MessageGuardEngine.Decision.Skip).reason)

        MessageGuardBridge.grantConsent(context, listOf("sms"))
        MessageGuardBridge.setEnabled(context, true)
        val store = MessageGuardStore(context)
        store.pause(MessageGuardStore.PAUSE_DAILY)
        assertFalse(store.enabled)
        assertEquals(MessageGuardStore.PAUSE_DAILY, MessageGuardBridge.status(context)["pausedReason"])
        assertTrue(store.hasConsent)
        assertTrue(store.turnOn())
        assertTrue(store.enabled)
        assertNull(store.pausedReason)
    }
}
