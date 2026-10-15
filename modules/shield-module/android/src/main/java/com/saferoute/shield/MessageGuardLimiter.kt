package com.saferoute.shield

import java.security.MessageDigest

/** Drops repeats and caps how many messages may leave the device per hour. */
internal class MessageGuardLimiter(
    private val now: () -> Long,
    private val loadStamps: () -> List<Long>,
    private val saveStamps: (List<Long>) -> Unit,
    private val maxPerHour: Int = MAX_PER_HOUR,
    private val dedupeWindowMs: Long = DEDUPE_MS,
) {
    private val seen = LinkedHashMap<String, Long>()

    @Synchronized
    fun isDuplicate(key: String): Boolean {
        val t = now()
        seen.entries.removeAll { t - it.value > dedupeWindowMs }
        return seen.containsKey(key)
    }

    @Synchronized
    fun remember(key: String) {
        seen[key] = now()
        while (seen.size > MAX_SEEN) seen.remove(seen.keys.first())
    }

    /** Takes one slot of the hourly budget. False when the budget is used up. */
    @Synchronized
    fun tryAcquire(): Boolean {
        val t = now()
        val recent = loadStamps().filter { t - it < HOUR_MS && it <= t }
        if (recent.size >= maxPerHour) {
            saveStamps(recent)
            return false
        }
        saveStamps(recent + t)
        return true
    }

    companion object {
        const val MAX_PER_HOUR = 20
        const val DEDUPE_MS = 10 * 60 * 1000L
        private const val HOUR_MS = 60 * 60 * 1000L
        private const val MAX_SEEN = 100

        /** Same message with different digits or spacing maps to the same key. */
        fun keyFor(redacted: String): String {
            val norm = redacted.lowercase().filterNot { Character.isDigit(it) || it.isWhitespace() }
            val digest = MessageDigest.getInstance("SHA-256").digest(norm.toByteArray(Charsets.UTF_8))
            return digest.joinToString("") { "%02x".format(it) }
        }
    }
}
