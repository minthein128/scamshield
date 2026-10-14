package com.saferoute.shield

/** Removes personal numbers and addresses from message text before it leaves the device. */
internal object MessageRedactor {
    const val PHONE = "[PHONE]"
    const val EMAIL = "[EMAIL]"
    const val NUMBER = "[NUMBER]"
    const val CODE_MARK = "[CODE]"

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
    private val USERINFO = Regex("""(?<=//)[^/@\s]+@""")

    fun redact(rawText: String, links: MessageLinks, maxLength: Int = 1000): String {
        val text = MessagePrefilter.normalize(rawText)
        val sb = StringBuilder()
        var pos = 0
        for (range in links.find(text)) {
            sb.append(redactPlain(text.substring(pos, range.first)))
            sb.append(redactLink(text.substring(range)))
            pos = range.last + 1
        }
        sb.append(redactPlain(text.substring(pos)))
        val out = sb.toString().replace(Regex("[ \\t]+"), " ").trim()
        return if (out.length <= maxLength) out else out.substring(0, maxLength).trimEnd()
    }

    fun hasPhoneLikeNumber(text: String): Boolean =
        RUN.findAll(text).any { digitCount(it.value) >= 9 }

    private fun redactPlain(segment: String): String {
        if (segment.isEmpty()) return segment
        var s = EMAIL_RE.replace(segment, EMAIL)
        s = CODE_AFTER.replace(s) { m ->
            val keep = m.value.dropLastWhile { Character.isDigit(it) }
            keep + CODE_MARK
        }
        s = CODE_BEFORE.replace(s) { m -> CODE_MARK + m.groupValues[1] + m.groupValues[2] }
        return RUN.replace(s) { m -> classify(m.value) }
    }

    private fun redactLink(link: String): String {
        var s = link.substringBefore('?').substringBefore('#')
        s = USERINFO.replace(s, "")
        return RUN.replace(s) { m -> if (digitCount(m.value) >= 6) NUMBER else m.value }
    }

    private fun classify(run: String): String {
        val digits = digitCount(run)
        if (digits < 6) return run
        if (THOUSANDS.matches(run) || DATE_ISO.matches(run) || DATE_LOCAL.matches(run)) return run
        val trimmed = run.trimStart('(')
        if (digits > 15) return NUMBER
        val phoneLike = digits >= 7 && (trimmed.startsWith("+") || trimmed.startsWith("0") || trimmed.startsWith("၀") ||
            run.any { !Character.isDigit(it) })
        return if (phoneLike) PHONE else NUMBER
    }

    private fun digitCount(s: String): Int = s.count { Character.isDigit(it) }
}
