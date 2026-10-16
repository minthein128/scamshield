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

    /** The sender is used only to score the message on the device; it is never part of the sent text. */
    fun prepare(text: String, sender: String?, names: Collection<String> = listOfNotNull(sender)): Decision {
        val verdict = prefilter.evaluate(text, sender)
        if (!verdict.send) return Decision.Skip(verdict.skip ?: MessagePrefilter.SKIP_LOW)
        val redacted = MessageRedactor.redact(text, prefilter.links, keywords.maxSendLength, names)
        val key = MessageGuardLimiter.keyFor(redacted)
        if (limiter.isDuplicate(key)) return Decision.Skip(SKIP_DUPLICATE)
        when (limiter.tryAcquire()) {
            MessageGuardLimiter.Slot.DAY_FULL -> return Decision.Skip(SKIP_DAILY)
            MessageGuardLimiter.Slot.HOUR_FULL -> return Decision.Skip(SKIP_HOURLY)
            MessageGuardLimiter.Slot.OK -> Unit
        }
        limiter.remember(key)
        return Decision.Send(redacted, key)
    }

    companion object {
        const val SKIP_DUPLICATE = "duplicate"
        const val SKIP_HOURLY = "rate_limit"
        const val SKIP_DAILY = "daily_limit"
    }
}
