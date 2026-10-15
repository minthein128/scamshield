package com.saferoute.shield

/** Decides what, if anything, leaves the device for one message. No Android service calls. */
internal class MessageGuardEngine(
    private val keywords: GuardKeywords,
    private val limiter: MessageGuardLimiter,
) {
    sealed class Decision {
        class Skip(val reason: String) : Decision()
        class Send(val text: String, val dedupeKey: String) : Decision()
    }

    private val prefilter = MessagePrefilter(keywords)

    fun prepare(text: String, sender: String?): Decision {
        val verdict = prefilter.evaluate(text, sender)
        if (!verdict.send) return Decision.Skip(verdict.skip ?: MessagePrefilter.SKIP_LOW)
        val redacted = MessageRedactor.redact(text, prefilter.links, keywords.maxSendLength)
        val key = MessageGuardLimiter.keyFor(redacted)
        if (limiter.isDuplicate(key)) return Decision.Skip("duplicate")
        if (!limiter.tryAcquire()) return Decision.Skip("rate_limit")
        limiter.remember(key)
        return Decision.Send(redacted, key)
    }
}
