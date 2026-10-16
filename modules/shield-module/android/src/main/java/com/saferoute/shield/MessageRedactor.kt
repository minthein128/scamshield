package com.saferoute.shield

/**
 * Removes personal details from message text before it leaves the device: phone numbers, emails,
 * codes, account and card numbers, likely person names, the sender's name and link paths.
 */
internal object MessageRedactor {
    const val PHONE = "[PHONE]"
    const val EMAIL = "[EMAIL]"
    const val NUMBER = "[NUMBER]"
    const val CODE_MARK = "[CODE]"
    const val ACCOUNT = "[ACCOUNT]"
    const val NAME = "[NAME]"
    const val PATH = "[PATH]"

    /** Hard cap on sent text, whatever the keyword file says. */
    const val MAX_SEND_LENGTH = 600

    private val EMAIL_RE = Regex("""[\p{L}\p{Nd}._%+-]+@[\p{L}\p{Nd}-]+(?:\.[\p{L}\p{Nd}-]+)*\.\p{L}{2,}""")
    private const val LATIN_WORDS = "code|otp|pin|passcode|kode|kodigo"
    private val CODE_AFTER = Regex(
        """(?i)(?:(?<![\p{L}\p{Nd}])(?:$LATIN_WORDS)|ကုဒ်နံပါတ်|ကုဒ်)\P{Nd}{0,20}?(?<!\p{Nd})\p{Nd}{3,8}(?!\p{Nd})"""
    )
    private val CODE_BEFORE = Regex(
        """(?i)(?<!\p{Nd})\p{Nd}{4,8}(?!\p{Nd})(\P{Nd}{0,12}?)((?:$LATIN_WORDS)(?![a-z])|ကုဒ်နံပါတ်|ကုဒ်)"""
    )
    private val RUN = Regex("""[+(]?\p{Nd}+(?:[ .\-()]{1,2}\p{Nd}+)*""")
    private val THOUSANDS = Regex("""^\p{Nd}{1,3}(?:[.,]\p{Nd}{3})+$""")
    private val DATE_ISO = Regex("""^\p{Nd}{4}-\p{Nd}{2}-\p{Nd}{2}$""")
    private val DATE_LOCAL = Regex("""^\p{Nd}{1,2}[./-]\p{Nd}{1,2}[./-]\p{Nd}{2,4}$""")

    private val MASKED_CARD = Regex("""(?<![\p{L}\p{Nd}])(?:[*xX•]{2,}[ -]?)+\p{Nd}{2,6}(?!\p{Nd})""")
    private val IBAN = Regex("""(?<![\p{L}\p{Nd}])[A-Z]{2}\p{Nd}{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?(?![\p{L}\p{Nd}])""")
    private const val ACCOUNT_WORDS =
        "(?<![a-z])(?:account|acct|a/c|acc|card|rekening|rek|kartu|akaun|ending in|ending)(?![a-z])|" +
            "บัญชี|บัตร|အကောင့်|ကတ်|ဘဏ်စာရင်း"
    private val ACCOUNT_AFTER = Regex(
        """(?i)((?:$ACCOUNT_WORDS)\P{Nd}{0,15}?)(?<!\p{Nd})(\p{Nd}(?:[ -]?\p{Nd}){3,30})(?!\p{Nd})"""
    )

    private const val NAME_WORD = """\p{Lu}[\p{L}\p{M}'’-]*"""
    private const val TITLES = """(?:Mrs|Mr|Ms|Miss|Dr|Ko|Ma|U|Daw|Khun|Pak|Bu|Kuya|Ate)\.?|(?i:a\.n\.|a/n|atas nama)"""
    private val LATIN_NAME = Regex(
        """(?<![\p{L}\p{Nd}])((?:(?i:hi|hello|hey|dear),?[ \t]+(?:(?:$TITLES)[ \t]+)?|(?:$TITLES),?[ \t]+))""" +
            """($NAME_WORD(?:[ \t]+$NAME_WORD){0,2})"""
    )
    private val NOT_NAMES = setOf(
        "customer", "customers", "sir", "madam", "ma'am", "maam", "valued", "member", "members", "user", "users",
        "client", "all", "team", "friend", "friends", "everyone", "there", "applicant", "winner", "pelanggan",
        "nasabah", "bapak", "ibu", "kakak", "kak", "po", "your", "you", "we", "our", "this", "the", "congratulations",
        "out", "it",
    )

    private const val MY = """[က-၉၌-႟ꩠ-ꩿꧠ-꧿]"""
    private const val MY_TITLE = "ကို|ဒေါ်|ဦး|မ"
    private const val MY_GREETING = "မင်္ဂလာပါ|ဟိုင်း|ဟယ်လို|ချစ်သော|လေးစားအပ်ပါသော|လေးစားရပါသော|(?i:hi|hello|dear)"
    private const val SEP = """[\s၊။,.!?:;()"']"""
    private val MY_STANDALONE = Regex("""(?:^|(?<=$SEP))(ဒေါ်|ဦး)([ \t]+)($MY+)""")
    private val MY_STANDALONE_AMBIGUOUS = Regex("""(?:^|(?<=[၊။\n][ \t]{0,3}))(ကို|မ)([ \t]+)($MY+)""")
    private val MY_AFTER_GREETING = Regex("""($MY_GREETING)([ \t,၊]*)($MY_TITLE)($MY+)""")
    private val MY_VOCATIVE = Regex("""(?:^|(?<=$SEP))($MY_TITLE)($MY+?)([ \t]*ရေ)(?!$MY)""")

    private const val TH = """[ก-๎]"""
    private const val TH_YOU = "คุณ"
    private val TH_GREETED = Regex("""((?:เรียน|สวัสดี(?:ครับ|ค่ะ|คะ)?|ถึง)[ \t]*$TH_YOU[ \t]?)($TH+)""")
    private val TH_ANY = Regex("""(?<!$TH)($TH_YOU[ \t]?)($TH{2,})""")
    private val TH_LATIN = Regex("""($TH_YOU[ \t]+)($NAME_WORD)""")
    private val TH_NOT_NAMES = listOf(
        "ได้", "มี", "ต้อง", "จะ", "สามารถ", "ถูก", "ชนะ", "ไม่", "ยัง", "ก็", "เป็น", "ควร", "เคย", "กำลัง", "คือ",
        "อาจ", "ค้าง", "ทำ", "ใช้", "ยืนยัน", "คลิก", "กด", "ติดต่อ", "โปรด", "ช่วย", "รับ", "ส่ง", "เข้า", "จ่าย",
        "ชำระ", "ครับ", "ค่ะ", "คะ", "นะ", "เอง", "และ", "หรือ", "ว่า", "ที่", "จาก", "แล้ว", "สมัคร", "โอน", "ลง",
        "อยู่", "ภาพ", "สมบัติ", "ค่า", "ประโยชน์", "ธรรม", "ลักษณะ", "ครู", "แม่", "พ่อ", "เท่านั้น", "หมอ", "เลย",
        "ถือ", "อายุ", "เพียง", "แค่", "ควรจะ", "พบ", "เห็น", "อ่าน", "ตอบ", "กรุณา",
    )

    fun redact(
        rawText: String,
        links: MessageLinks,
        maxLength: Int = MAX_SEND_LENGTH,
        names: Collection<String> = emptyList(),
    ): String {
        val text = scrubKnownNames(MessagePrefilter.normalize(rawText), names)
        val sb = StringBuilder()
        var pos = 0
        for (range in links.find(text)) {
            sb.append(redactPlain(text.substring(pos, range.first)))
            sb.append(redactLink(text.substring(range)))
            pos = range.last + 1
        }
        sb.append(redactPlain(text.substring(pos)))
        val out = sb.toString().replace(Regex("[ \\t]+"), " ").trim()
        val cap = minOf(maxLength, MAX_SEND_LENGTH)
        return if (out.length <= cap) out else out.substring(0, cap).trimEnd()
    }

    fun hasPhoneLikeNumber(text: String): Boolean =
        RUN.findAll(text).any { digitCount(it.value) >= 9 }

    /**
     * Removes the sender or chat title where an app copies it into the text. A one-word title such
     * as a brand name is removed only as a "Name:" prefix, so the brand stays visible to the check.
     */
    fun scrubKnownNames(text: String, names: Collection<String>): String {
        var s = text
        for (raw in names.map { it.trim() }.filter { it.length >= 2 }.distinct().sortedByDescending { it.length }) {
            if (raw.count { Character.isLetter(it) } < 2) continue
            val quoted = Regex.escape(raw)
            s = Regex("""(?i)^$quoted\s*[:：]\s*""").replace(s, "")
            val words = raw.split(Regex("\\s+")).filter { it.isNotEmpty() }
            if (words.size >= 2) {
                s = Regex("""(?i)(?<![\p{L}\p{Nd}])$quoted(?![\p{L}\p{Nd}])""").replace(s, NAME)
            }
        }
        return s
    }

    private fun redactPlain(segment: String): String {
        if (segment.isEmpty()) return segment
        var s = EMAIL_RE.replace(segment, EMAIL)
        s = IBAN.replace(s, ACCOUNT)
        s = MASKED_CARD.replace(s, ACCOUNT)
        s = ACCOUNT_AFTER.replace(s) { m ->
            if (DATE_ISO.matches(m.groupValues[2]) || DATE_LOCAL.matches(m.groupValues[2])) m.value
            else m.groupValues[1] + ACCOUNT
        }
        s = CODE_AFTER.replace(s) { m ->
            val keep = m.value.dropLastWhile { Character.isDigit(it) }
            keep + CODE_MARK
        }
        s = CODE_BEFORE.replace(s) { m -> CODE_MARK + m.groupValues[1] + m.groupValues[2] }
        s = RUN.replace(s) { m -> classify(m.value) }
        return redactNames(s)
    }

    fun redactNames(text: String): String {
        var s = LATIN_NAME.replace(text) { m ->
            val words = m.groupValues[2].split(Regex("[ \\t]+"))
            val keep = words.takeWhile { it.lowercase().trimEnd('.', ',') !in NOT_NAMES }
            if (keep.isEmpty()) m.value
            else m.groupValues[1] + (listOf(NAME) + words.drop(keep.size)).joinToString(" ")
        }
        s = MY_AFTER_GREETING.replace(s) { m -> m.groupValues[1] + m.groupValues[2] + m.groupValues[3] + NAME }
        s = MY_VOCATIVE.replace(s) { m -> m.groupValues[1] + NAME + m.groupValues[3] }
        s = MY_STANDALONE.replace(s) { m -> m.groupValues[1] + m.groupValues[2] + NAME }
        s = MY_STANDALONE_AMBIGUOUS.replace(s) { m -> m.groupValues[1] + m.groupValues[2] + NAME }
        s = TH_GREETED.replace(s) { m -> m.groupValues[1] + NAME }
        s = TH_LATIN.replace(s) { m -> m.groupValues[1] + NAME }
        s = TH_ANY.replace(s) { m ->
            if (TH_NOT_NAMES.any { m.groupValues[2].startsWith(it) }) m.value else m.groupValues[1] + NAME
        }
        return s
    }

    /** Keeps the scheme and host of a link. The path, query and fragment may name or track the reader. */
    private fun redactLink(link: String): String {
        val scheme = Regex("""(?i)^https?://""").find(link)?.value.orEmpty()
        val rest = link.substring(scheme.length)
        val end = rest.indexOfFirst { it == '/' || it == '?' || it == '#' }.let { if (it < 0) rest.length else it }
        val host = rest.substring(0, end).substringAfterLast('@')
        val tail = rest.substring(end)
        val safeHost = RUN.replace(host) { m -> if (digitCount(m.value) >= 6) NUMBER else m.value }
        return scheme + safeHost + if (tail.trim('/').isEmpty()) "" else "/$PATH"
    }

    private fun classify(run: String): String {
        val digits = digitCount(run)
        if (digits < 6) return run
        if (THOUSANDS.matches(run) || DATE_ISO.matches(run) || DATE_LOCAL.matches(run)) return run
        val trimmed = run.trimStart('(')
        if (trimmed.startsWith("+") && digits <= 15) return PHONE
        if (digits in 13..19) return ACCOUNT
        if (digits > 15) return NUMBER
        val phoneLike = digits >= 7 && (trimmed.startsWith("0") || trimmed.startsWith("၀") ||
            run.any { !Character.isDigit(it) })
        return if (phoneLike) PHONE else NUMBER
    }

    private fun digitCount(s: String): Int = s.count { Character.isDigit(it) }
}
