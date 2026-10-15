package com.saferoute.shield

import android.app.Notification
import android.content.Context
import android.os.Bundle
import androidx.test.core.app.ApplicationProvider
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class MessageGuardTest {

    private val context: Context = ApplicationProvider.getApplicationContext()
    private val keywords = GuardKeywords.load(context)
    private val prefilter = MessagePrefilter(keywords)

    private class Fixture(val name: String, val sender: String?, val text: String)

    private val risky = listOf(
        Fixture("en parcel", "+44 7700 900123", "DHL: Your parcel 8837 2910 4410 could not be delivered. Pay a \$1.99 redelivery fee within 24 hours: http://dhl-redeliver.top/pay"),
        Fixture("en bank", "MAYBANK", "Your Maybank account is locked due to unusual activity. Verify now at bit.ly/3xYzAb or it will be closed."),
        Fixture("en job", "+66 81 234 5678", "Hiring! Earn \$200 per day, no experience, work from home. Registration fee \$20. Message us on Telegram @jobs_fast"),
        Fixture("id parcel", "+62 812-3456-7890", "Paket J&T Anda tertahan di bea cukai. Segera bayar biaya Rp 25.000 di s.id/jnt-cek dalam 24 jam"),
        Fixture("id bank", "BCA-INFO", "BCA: Akun m-banking Anda diblokir. Segera verifikasi di bca-klik.xyz atau rekening akan dibekukan."),
        Fixture("id job", "+62 857-1111-2222", "Lowongan kerja online tanpa pengalaman, gaji Rp 500.000 per hari. Hubungi kami di Telegram untuk daftar."),
        Fixture("tl parcel", "+63 917 555 0100", "LBC: Hindi naihatid ang parcel mo. Magbayad ng P45 sa loob ng 24 oras: lbc-track.top/p"),
        Fixture("tl bank", "GCash", "GCash: Na-lock ang account mo. I-verify agad sa gcash-ph.click/verify o ma-block ito ngayong araw."),
        Fixture("tl job", "+63 998 000 1234", "Hiring! Kumita ng P1,500 kada araw, walang experience, work from home. Bayad sa application P300. Telegram: @trabaho_ph"),
        Fixture("my parcel", "+95 9 4455 1122", "သင့်ပါဆယ်ကို ပို့မရပါ။ အကောက်ခွန် ၅၀၀၀ ကျပ် ယနေ့အတွင်း ပေးချေပါ။ http://post-mm.top/pay"),
        Fixture("my bank", "KBZPay", "KBZPay အကောင့်ကို ပိတ်ထားပါသည်။ ချက်ချင်း အတည်ပြုရန် http://kbz-verify.xyz"),
        Fixture("my job", "+66 90 111 2222", "ထိုင်းနိုင်ငံတွင် အလုပ်ခေါ်ပါသည်။ လစာ တစ်ရက်လျှင် ၁၅၀၀ ဘတ်၊ အတွေ့အကြုံမလို။ စာရင်းသွင်းကြေး ၂၀၀၀၀ ကျပ်။ Telegram ကို ဆက်သွယ်ပါ"),
        Fixture("unknown sender link", "+95 9 123 456 789", "Hi, is this still available? Check my listing www.deals-mm.com"),
        Fixture("otp with link", "SHOP", "Your code is 482913. Confirm your login at http://shop-secure.top/confirm"),
        Fixture("vishing otp", "+1 555 010 9999", "Bank alert: transfer of \$450 pending. If not you, call 0917 123 4567 and read out the OTP 482913"),
    )

    private val genuineOtp = listOf(
        Fixture("en otp", "+1 650 253 0000", "Your verification code is 482913. Do not share it with anyone."),
        Fixture("google otp", "22000", "G-482913 is your Google verification code"),
        Fixture("id otp", "BCA", "Kode OTP Anda 739215. Jangan berikan kode ini kepada siapa pun termasuk pihak bank."),
        Fixture("tl otp", "GCash", "Ang iyong OTP ay 561203. Huwag ibahagi ang code na ito sa kahit sino."),
        Fixture("my otp", "KBZPay", "သင့် OTP ကုဒ်နံပါတ်မှာ 305918 ဖြစ်ပါသည်။ မည်သူ့ကိုမျှ မပေးပါနှင့်။"),
    )

    private val benign = listOf(
        Fixture("dinner", "Mom", "Hey are we still on for dinner tonight at 7?"),
        Fixture("meeting", "Aung Aung", "Meeting moved to 3pm, see you in room 4 after lunch"),
        Fixture("friend transfer", "Maria", "thanks for the transfer, I got it this morning"),
        Fixture("friend link", "Ko Zaw", "Check this out www.youtube.com/watch?v=abc123"),
        Fixture("greeting unknown", "+95 9 777 888 999", "Hello, how are you doing today my friend?"),
        Fixture("short", "Dad", "ok see you"),
    )

    @Test
    fun risky_messages_pass_the_threshold() {
        for (f in risky) {
            val r = prefilter.evaluate(f.text, f.sender)
            assertTrue("${f.name} should be sent, score=${r.score} signals=${r.signals}", r.send)
        }
    }

    @Test
    fun genuine_otp_is_skipped_entirely() {
        for (f in genuineOtp) {
            val r = prefilter.evaluate(f.text, f.sender)
            assertFalse("${f.name} must not be sent", r.send)
            assertEquals(f.name, MessagePrefilter.SKIP_OTP, r.skip)
        }
    }

    @Test
    fun otp_with_link_or_phone_is_not_treated_as_genuine() {
        assertFalse(prefilter.isGenuineOtp(risky.first { it.name == "otp with link" }.text))
        assertFalse(prefilter.isGenuineOtp(risky.first { it.name == "vishing otp" }.text))
    }

    @Test
    fun ordinary_chat_stays_on_device() {
        for (f in benign) {
            val r = prefilter.evaluate(f.text, f.sender)
            assertFalse("${f.name} must not be sent, score=${r.score} signals=${r.signals}", r.send)
        }
    }

    @Test
    fun signals_are_reported() {
        val r = prefilter.evaluate(risky[0].text, risky[0].sender)
        assertTrue(r.signals.containsAll(listOf("link", "parcel", "payment", "urgency", "unknown_sender")))
        val shortened = prefilter.evaluate(risky[1].text, risky[1].sender)
        assertTrue(shortened.signals.contains("shortener"))
    }

    @Test
    fun unknown_sender_detection() {
        assertTrue(MessagePrefilter.isUnknownSender("+63 917 123 4567"))
        assertTrue(MessagePrefilter.isUnknownSender(""))
        assertTrue(MessagePrefilter.isUnknownSender(null))
        assertFalse(MessagePrefilter.isUnknownSender("Mom"))
        assertFalse(MessagePrefilter.isUnknownSender("Aung Aung"))
    }

    @Test
    fun keyword_file_covers_four_languages_per_category() {
        val raw = context.resources.openRawResource(R.raw.message_guard_keywords).bufferedReader(Charsets.UTF_8).use { it.readText() }
        val cats = JSONObject(raw).getJSONObject("categories")
        val names = cats.keys().asSequence().toList()
        assertTrue(names.containsAll(listOf("payment", "otp", "account", "urgency", "parcel", "bank", "job")))
        for (name in names) {
            for (lang in listOf("en", "id", "tl", "my")) {
                assertTrue("$name/$lang", cats.getJSONObject(name).getJSONArray(lang).length() > 0)
            }
        }
    }

    @Test
    fun redacts_phone_numbers() {
        val out = redact("Call +63 917 123 4567 or 0917-123-4567 or (02) 8123 4567 now")
        assertEquals("Call [PHONE] or [PHONE] or [PHONE] now", out)
    }

    @Test
    fun redacts_burmese_digit_phone() {
        assertEquals("ဖုန်း [PHONE] ကိုခေါ်ပါ", redact("ဖုန်း ၀၉၁၂၃၄၅၆၇၈၉ ကိုခေါ်ပါ"))
    }

    @Test
    fun redacts_emails() {
        assertEquals("Send your CV to [EMAIL] today", redact("Send your CV to hr.jobs+th@gmail-mail.com today"))
    }

    @Test
    fun redacts_long_digit_runs() {
        assertEquals("Account [NUMBER] is on hold", redact("Account 123456789012 is on hold"))
        assertEquals("Card [NUMBER] charged", redact("Card 4111 1111 1111 1111 charged"))
    }

    @Test
    fun redacts_short_codes_next_to_a_code_word() {
        assertEquals("Your code is [CODE]", redact("Your code is 4821"))
        assertEquals("[CODE] is your OTP", redact("4821 is your OTP"))
        assertEquals("Kode OTP: [CODE]. Jangan bagikan", redact("Kode OTP: 739215. Jangan bagikan"))
    }

    @Test
    fun keeps_amounts_dates_and_short_numbers() {
        val text = "Pay Rp 1.500.000 or \$450 by 2026-10-14, ref 500"
        assertEquals(text, redact(text))
    }

    @Test
    fun trims_links_but_keeps_host_and_path() {
        assertEquals(
            "Pay at https://dhl-redeliver.top/pay now",
            redact("Pay at https://dhl-redeliver.top/pay?id=998877&mail=a@b.com#x now"),
        )
        assertEquals("Open bit.ly/[NUMBER]", redact("Open bit.ly/99887766"))
    }

    @Test
    fun output_is_capped() {
        val out = MessageRedactor.redact("word ".repeat(500), prefilter.links, 1000)
        assertTrue(out.length <= 1000)
    }

    @Test
    fun sent_text_never_holds_personal_numbers() {
        val engine = engine()
        val text = "Hi Anna, your parcel is held. Pay the fee within 24 hours at tinyurl.com/x9?uid=5551234567. " +
            "Call +63 917 123 4567 or mail help@dhl-fake.com, ref 998877665544"
        val decision = engine.prepare(text, "+63 900 000 0000") as MessageGuardEngine.Decision.Send
        assertFalse(Regex("""\p{Nd}{6,}""").containsMatchIn(decision.text))
        assertFalse(decision.text.contains("@"))
        assertTrue(decision.text.contains("[PHONE]"))
        assertTrue(decision.text.contains("[EMAIL]"))
        assertTrue(decision.text.contains("tinyurl.com/x9"))
    }

    @Test
    fun engine_skips_duplicates() {
        val engine = engine()
        val f = risky[0]
        assertTrue(engine.prepare(f.text, f.sender) is MessageGuardEngine.Decision.Send)
        val again = engine.prepare(f.text.replace("8837 2910 4410", "1111 2222 3333"), f.sender)
        assertEquals("duplicate", (again as MessageGuardEngine.Decision.Skip).reason)
    }

    @Test
    fun engine_caps_checks_per_hour() {
        var t = 1_000_000L
        val engine = engine { t }
        var sent = 0
        for (i in 1..25) {
            val d = engine.prepare("Your parcel is held, pay fee to ${'a' + i} at http://pay-${'a' + i}.top/x within 24 hours", "+1 555 000 1111")
            if (d is MessageGuardEngine.Decision.Send) sent++
            else assertEquals("rate_limit", (d as MessageGuardEngine.Decision.Skip).reason)
        }
        assertEquals(20, sent)
        t += 61 * 60 * 1000L
        assertTrue(engine.prepare("Your parcel is held, pay fee 99 dollars at http://pay-new.top/x within 24 hours", "+1 555 000 1111") is MessageGuardEngine.Decision.Send)
    }

    @Test
    fun engine_never_sends_genuine_otp() {
        val engine = engine()
        for (f in genuineOtp) {
            val d = engine.prepare(f.text, f.sender)
            assertEquals(f.name, "otp", (d as MessageGuardEngine.Decision.Skip).reason)
        }
    }

    @Test
    fun only_allowlisted_apps_are_watched() {
        val watched = MessageApps.watchedPackages("com.samsung.android.messaging", null)
        assertTrue(watched.containsAll(listOf(
            "com.google.android.apps.messaging", "com.whatsapp", "com.viber.voip", "org.telegram.messenger",
            "jp.naver.line.android", "com.facebook.orca", "com.zing.zalo", "org.thoughtcrime.securesms",
            "com.samsung.android.messaging",
        )))
        for (other in listOf("com.android.chrome", "com.google.android.gm", "com.instagram.android", "com.saferoute.antifraud")) {
            assertFalse(other, other in watched)
        }
    }

    @Test
    fun user_can_turn_apps_off() {
        val watched = MessageApps.watchedPackages("com.samsung.android.messaging", setOf("whatsapp"))
        assertEquals(setOf("com.whatsapp", "com.whatsapp.w4b"), watched)
        assertTrue(MessageApps.watchedPackages("com.samsung.android.messaging", emptySet()).isEmpty())
        assertTrue("com.samsung.android.messaging" in MessageApps.watchedPackages("com.samsung.android.messaging", setOf("sms")))
    }

    @Test
    fun default_sms_in_catalog_is_controlled_by_its_own_toggle() {
        val gm = "com.google.android.apps.messaging"
        assertTrue(gm in MessageApps.watchedPackages(gm, setOf("messages")))
        assertFalse(gm in MessageApps.watchedPackages(gm, setOf("sms")))
    }

    @Test
    fun extractor_reads_newest_message_and_sender() {
        val n = Notification()
        n.extras = Bundle().apply {
            putCharSequence(Notification.EXTRA_TITLE, "+63 917 000 1111")
            putCharSequence(Notification.EXTRA_TEXT, "2 new messages")
            putParcelableArray(
                Notification.EXTRA_MESSAGES,
                arrayOf(
                    Bundle().apply { putCharSequence("text", "older") },
                    Bundle().apply { putCharSequence("text", "newest message body"); putCharSequence("sender", "+63 917 000 1111") },
                ),
            )
        }
        val e = MessageGuardExtractor.extract(n)
        assertNotNull(e)
        assertEquals("newest message body", e!!.text)
        assertEquals("+63 917 000 1111", e.sender)
    }

    @Test
    fun extractor_falls_back_to_plain_text_and_ignores_empty() {
        val plain = Notification()
        plain.extras = Bundle().apply {
            putCharSequence(Notification.EXTRA_TITLE, "Mom")
            putCharSequence(Notification.EXTRA_TEXT, "dinner at 7")
        }
        assertEquals("dinner at 7", MessageGuardExtractor.extract(plain)!!.text)
        val empty = Notification()
        empty.extras = Bundle()
        assertNull(MessageGuardExtractor.extract(empty))
    }

    @Test
    fun request_body_is_a_redacted_message_check() {
        val body = JSONObject(String(MessageCheckClient.body("hello [PHONE]", "my", false), Charsets.UTF_8))
        assertEquals("message", body.getString("kind"))
        assertEquals("hello [PHONE]", body.getString("text"))
        assertEquals("my", body.getString("language"))
        assertFalse(body.getBoolean("shareSignals"))
        assertFalse(body.has("imageBase64"))
        assertFalse(body.has("sender"))
    }

    @Test
    fun warning_states_follow_the_verdict() {
        assertEquals(ShieldOverlay.State.DANGER, MessageGuardNotifier.stateFor("danger"))
        assertEquals(ShieldOverlay.State.CAREFUL, MessageGuardNotifier.stateFor("careful"))
        assertNull(MessageGuardNotifier.stateFor("safe"))
        assertEquals("Looks risky", MessageGuardNotifier.chipFor(ShieldOverlay.State.DANGER))
        assertEquals("Shows warning signs", MessageGuardNotifier.chipFor(ShieldOverlay.State.CAREFUL))
        assertEquals("saferoute://report/chk_1", MessageGuardNotifier.reportUri("chk_1").toString())
    }

    private fun redact(text: String): String = MessageRedactor.redact(text, prefilter.links)

    private fun engine(clock: () -> Long = System::currentTimeMillis): MessageGuardEngine {
        var stamps: List<Long> = emptyList()
        return MessageGuardEngine(keywords, MessageGuardLimiter(clock, { stamps }, { stamps = it }))
    }
}
