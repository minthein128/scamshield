package com.saferoute.shield

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class MessageRedactionTest {

    private val context: Context = ApplicationProvider.getApplicationContext()
    private val keywords = GuardKeywords.load(context)
    private val links = MessageLinks(keywords)

    /** A message, its notification sender, and every personal detail that must not leave the phone. */
    private class Fixture(val name: String, val sender: String, val text: String, val secrets: List<String>)

    private val fixtures = listOf(
        Fixture(
            "en parcel", "Anna Smith",
            "Hi Anna, your DHL parcel is held. Pay the fee at https://dhl-redeliver.top/pay/anna.smith?id=998877. " +
                "Call +44 7700 900123 or mail anna.smith@gmail.com. Card ending 4821 will be charged.",
            listOf("Anna", "anna.smith", "998877", "7700 900123", "900123", "gmail.com", "4821", "Smith"),
        ),
        Fixture(
            "en bank", "+1 555 010 9999",
            "Dear Mr. John Smith, your account 1234-5678-9012 is locked. Verify at bit.ly/js-verify-889 or card **** 5521.",
            listOf("John", "Smith", "1234-5678-9012", "5678", "js-verify", "889", "5521", "555 010 9999"),
        ),
        Fixture(
            "en job", "Recruiter",
            "Hello Maria Santos! Earn \$200/day. Send your ID to hr.jobs@work-fast.vip or WhatsApp 0917 123 4567. Bank acct 00123456789.",
            listOf("Maria", "Santos", "hr.jobs", "work-fast.vip", "0917 123 4567", "4567", "00123456789"),
        ),
        Fixture(
            "id transfer", "Budi Santoso",
            "Halo Bu Sari, paket Anda tertahan. Bayar Rp 25.000 ke rekening BCA 8830 1234 56 a.n. Budi Santoso. Info: s.id/paket-sari-77",
            listOf("Sari", "8830 1234 56", "1234", "Budi", "Santoso", "paket-sari", "77"),
        ),
        Fixture(
            "id job", "+62 857-1111-2222",
            "Selamat Pak Joko, Anda diterima kerja. Kirim KTP ke joko.hrd@gmail.com, IBAN ID12 3456 7890 1234 5678",
            listOf("Joko", "joko.hrd", "1111-2222", "3456 7890", "7890"),
        ),
        Fixture(
            "tl prize", "GCash",
            "Hi po Kuya Jun, nanalo ka ng P50,000! I-claim sa gcash-promo.click/claim?u=jun. GCash no. 0917 555 0100. - Ate Liza",
            listOf("Jun", "jun", "0917 555 0100", "0100", "Liza"),
        ),
        Fixture(
            "my parcel", "+95 9 4455 1122",
            "မင်္ဂလာပါ ကိုအောင်ကျော်၊ သင့်ပါဆယ် ရောက်နေပါပြီ။ ၅၀၀၀ ကျပ် ပေးချေပါ http://post-mm.top/pay/aung " +
                "ဖုန်း ၀၉၄၄၅၅၁၁၂၂ သို့ ဆက်သွယ်ပါ။ ဒေါ် ခင်ခင်",
            listOf("အောင်ကျော်", "aung", "၀၉၄၄၅၅၁၁၂၂", "ခင်ခင်", "4455 1122"),
        ),
        Fixture(
            "my vocative", "Ma Thida",
            "မသီတာရေ KBZPay အကောင့် 0912345678901 ကို ပိတ်ထားပါသည်။ http://kbz-verify.xyz/u/thida မှာ အတည်ပြုပါ။ U Kyaw Win",
            listOf("သီတာ", "0912345678901", "thida", "Kyaw", "Win", "Thida"),
        ),
        Fixture(
            "th bank", "+66 81 234 5678",
            "เรียน คุณสมชาย บัญชีของคุณถูกระงับ โปรดยืนยันที่ https://kbank-th.top/verify?u=somchai โทร 081 234 5678 บัตร **** 1234",
            listOf("สมชาย", "somchai", "081 234 5678", "5678", "1234"),
        ),
        Fixture(
            "th latin name", "LINE",
            "สวัสดีค่ะ คุณ Anna ได้รับรางวัล 5,000 บาท กรุณาโอนค่าธรรมเนียม ติดต่อ Khun Nok ที่ nok.prize@hotmail.com",
            listOf("Anna", "Nok", "nok.prize", "hotmail"),
        ),
    )

    @Test
    fun no_fixture_name_number_or_email_survives() {
        for (f in fixtures) {
            val out = MessageRedactor.redact(f.text, links, keywords.maxSendLength, listOf(f.sender))
            for (secret in f.secrets) {
                assertFalse("${f.name}: '$secret' survived in: $out", out.contains(secret, ignoreCase = true))
            }
            assertFalse("${f.name}: email survived in: $out", out.contains("@"))
            assertFalse("${f.name}: long number survived in: $out", Regex("""\p{Nd}{5,}""").containsMatchIn(out))
        }
    }

    @Test
    fun scam_signals_survive_redaction() {
        val out = MessageRedactor.redact(fixtures[0].text, links)
        assertTrue(out, out.contains("https://dhl-redeliver.top/[PATH]"))
        assertTrue(out, out.contains("Pay the fee"))
        assertTrue(out, out.contains("parcel is held"))
        val thai = MessageRedactor.redact(fixtures[8].text, links)
        assertTrue(thai, thai.contains("https://kbank-th.top/[PATH]"))
        assertTrue(thai, thai.contains("บัญชีของคุณถูกระงับ"))
    }

    @Test
    fun redacts_names_after_greetings_and_titles() {
        assertEquals("Hi [NAME], pay now", redact("Hi Anna, pay now"))
        assertEquals("Dear Mr. [NAME], your loan", redact("Dear Mr. John Smith, your loan"))
        assertEquals("Ko [NAME] sent it", redact("Ko Aung Kyaw sent it"))
        assertEquals("Daw [NAME]", redact("Daw Khin Khin"))
        assertEquals("Kuya [NAME], Ate [NAME]", redact("Kuya Jun, Ate Liza"))
        assertEquals("Pak [NAME] dan Bu [NAME]", redact("Pak Joko dan Bu Sari"))
        assertEquals("Khun [NAME] ok", redact("Khun Nok ok"))
        assertEquals("transfer a.n. [NAME]", redact("transfer a.n. Budi Santoso"))
    }

    @Test
    fun keeps_generic_greetings() {
        for (text in listOf("Dear Customer, your account is locked", "Dear Valued Customer", "Hi there, Sir", "Don't Miss Out today")) {
            assertEquals(text, redact(text))
        }
        assertEquals("Hello, how are you?", redact("Hello, how are you?"))
    }

    @Test
    fun burmese_honorifics_need_a_clear_name_position() {
        assertEquals("မင်္ဂလာပါ ကို[NAME]", redact("မင်္ဂလာပါ ကိုအောင်"))
        assertEquals("ဒေါ် [NAME] ထံ", redact("ဒေါ် ခင်ခင် ထံ"))
        assertEquals("မ[NAME]ရေ ငွေလွှဲပါ", redact("မသီတာရေ ငွေလွှဲပါ"))
        val plain = "သင့်ပါဆယ်ကို ပို့မရပါ။ မည်သူ့ကိုမျှ မပေးပါနှင့်။ ဦးစွာ ဖတ်ပါ"
        assertEquals(plain, redact(plain))
    }

    @Test
    fun thai_khun_as_pronoun_or_word_part_is_kept() {
        for (text in listOf("คุณได้รับรางวัล", "ขอบคุณครับ", "คุณสมบัติ: อายุ 20 ปี", "บัญชีของคุณถูกระงับ")) {
            assertEquals(text, redact(text))
        }
        assertEquals("คุณ[NAME] โอนเงิน", redact("คุณสมชาย โอนเงิน"))
    }

    @Test
    fun masks_account_and_card_numbers() {
        assertEquals("Card [ACCOUNT] used", redact("Card XXXX-XXXX-1234 used"))
        assertEquals("rekening [ACCOUNT] diblokir", redact("rekening 8830 1234 56 diblokir"))
        assertEquals("ending in [ACCOUNT].", redact("ending in 4821."))
        assertEquals("Pay [ACCOUNT]", redact("Pay 4111111111111111"))
        assertEquals("IBAN [ACCOUNT]", redact("IBAN GB29 NWBK 6016 1331 9268 19"))
        assertEquals("account closes in 24 hours", redact("account closes in 24 hours"))
        assertEquals("accept 20 baht", redact("accept 20 baht"))
    }

    @Test
    fun sender_is_scrubbed_from_text_but_brands_stay() {
        assertEquals("Hello there", MessageRedactor.scrubKnownNames("Aung Aung: Hello there", listOf("Aung Aung")))
        assertEquals("call [NAME] now", MessageRedactor.scrubKnownNames("call aung aung now", listOf("Aung Aung")))
        assertEquals("your wallet", MessageRedactor.scrubKnownNames("GCash: your wallet", listOf("GCash")))
        assertEquals("your GCash wallet", MessageRedactor.scrubKnownNames("your GCash wallet", listOf("GCash")))
    }

    @Test
    fun sent_body_never_carries_sender_or_title() {
        var stamps: List<Long> = emptyList()
        val engine = MessageGuardEngine(keywords, MessageGuardLimiter(System::currentTimeMillis, { stamps }, { stamps = it }))
        val sender = "Maria Clara Santos"
        val text = "Maria Clara Santos: your parcel is held, pay the fee at http://lbc-track.top/p within 24 hours"
        val d = engine.prepare(text, sender, listOf(sender, "Family chat")) as MessageGuardEngine.Decision.Send
        val body = JSONObject(String(MessageCheckClient.body(d.text, "en", false), Charsets.UTF_8))
        assertEquals(setOf("kind", "text", "language"), body.keys().asSequence().toSet())
        assertFalse(body.toString(), body.toString().contains("Maria"))
        assertFalse(body.toString(), body.toString().contains("Family chat"))
    }

    @Test
    fun truncates_to_600_characters_after_redaction() {
        val long = "Pay the fee at http://pay.top/x now. " + "Call +63 917 123 4567 please. ".repeat(40)
        val out = MessageRedactor.redact(long, links, 5000)
        assertTrue(out.length <= 600)
        assertFalse(out.contains("917"))
    }

    private fun redact(text: String): String = MessageRedactor.redact(text, links)
}
