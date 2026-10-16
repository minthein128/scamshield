package com.saferoute.shield

/** Local scoring of a message. Only a result with send = true may leave the device. */
internal class MessagePrefilter(private val keywords: GuardKeywords) {

    class Result(val send: Boolean, val skip: String?, val score: Int, val signals: List<String>)

    val links = MessageLinks(keywords)
    private val matchers: Map<String, List<(String) -> Boolean>> =
        keywords.categories.mapValues { (_, list) -> list.map(::matcher) }
    private val otpWords = matchers["otp"].orEmpty()

    fun evaluate(rawText: String, sender: String?): Result {
        val text = normalize(rawText)
        if (text.length < keywords.minLength) return Result(false, SKIP_SHORT, 0, emptyList())
        val lower = text.lowercase()
        if (isGenuineOtp(text, lower)) return Result(false, SKIP_OTP, 0, emptyList())

        val signals = ArrayList<String>()
        val found = links.find(text)
        if (found.isNotEmpty()) {
            signals.add("link")
            if (links.hasShortener(text)) signals.add("shortener")
        }
        for ((name, list) in matchers) {
            if (list.any { it(lower) }) signals.add(name)
        }
        if (isUnknownSender(sender)) signals.add("unknown_sender")

        val score = signals.sumOf { keywords.weight(it) }
        return if (score >= keywords.threshold) Result(true, null, score, signals)
        else Result(false, SKIP_LOW, score, signals)
    }

    /** A short code message with a code word, a 4 to 8 digit code, no link and no phone number. */
    fun isGenuineOtp(text: String, lower: String = text.lowercase()): Boolean {
        if (text.length > keywords.otpMaxLength) return false
        if (links.find(text).isNotEmpty()) return false
        if (MessageRedactor.hasPhoneLikeNumber(text)) return false
        if (otpWords.none { it(lower) }) return false
        return CODE.containsMatchIn(text)
    }

    private fun matcher(keyword: String): (String) -> Boolean {
        val k = keyword.lowercase()
        val plain = k.all { it in 'a'..'z' || it in '0'..'9' }
        if (plain && k.length <= 5) {
            val re = Regex("(?<![\\p{L}\\p{Nd}])" + Regex.escape(k) + "(?![\\p{L}\\p{Nd}])")
            return { re.containsMatchIn(it) }
        }
        return { it.contains(k) }
    }

    companion object {
        const val SKIP_SHORT = "short"
        const val SKIP_OTP = "otp"
        const val SKIP_LOW = "below_threshold"

        private val CODE = Regex("""(?<![\p{L}\p{Nd}])(?:\p{Nd}{4,8}|\p{Nd}{3}[- ]\p{Nd}{3})(?![\p{L}\p{Nd}])""")
        private val ZERO_WIDTH = Regex("[​‌‍﻿]")

        fun normalize(text: String): String = ZERO_WIDTH.replace(text, "").trim()

        /** A sender title that is a phone number or a short code is not a saved contact. */
        fun isUnknownSender(sender: String?): Boolean {
            val s = sender?.trim().orEmpty()
            if (s.isEmpty()) return true
            val digits = s.count { Character.isDigit(it) }
            val letters = s.count { Character.isLetter(it) }
            return digits >= 5 && digits > letters
        }
    }
}
