package com.saferoute.shield

import java.security.MessageDigest

/** Drops repeats and caps how many messages may leave the device per hour and per day. */
internal class MessageGuardLimiter(
    private val now: () -> Long,
    private val loadStamps: () -> List<Long>,
    private val saveStamps: (List<Long>) -> Unit,
    private val maxPerHour: Int = MAX_PER_HOUR,
    private val maxPerDay: Int = MAX_PER_DAY,
    private val dedupeWindowMs: Long = DEDUPE_MS,
) {
    enum class Slot { OK, HOUR_FULL, DAY_FULL }

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

    /** Takes one slot of the hourly and daily budgets, or says which budget is used up. */
    @Synchronized
    fun tryAcquire(): Slot {
        val t = now()
        val day = loadStamps().filter { t - it < DAY_MS && it <= t }
        val hour = day.count { t - it < HOUR_MS }
        val slot = when {
            day.size >= maxPerDay -> Slot.DAY_FULL
            hour >= maxPerHour -> Slot.HOUR_FULL
            else -> Slot.OK
        }
        saveStamps(if (slot == Slot.OK) day + t else day)
        return slot
    }

    companion object {
        const val MAX_PER_HOUR = 20
        const val MAX_PER_DAY = 60
        const val DEDUPE_MS = 10 * 60 * 1000L
        private const val HOUR_MS = 60 * 60 * 1000L
        private const val DAY_MS = 24 * HOUR_MS
        private const val MAX_SEEN = 100

        /** Same message with different digits or spacing maps to the same key. */
        fun keyFor(redacted: String): String {
            val norm = redacted.lowercase().filterNot { Character.isDigit(it) || it.isWhitespace() }
            val digest = MessageDigest.getInstance("SHA-256").digest(norm.toByteArray(Charsets.UTF_8))
            return digest.joinToString("") { "%02x".format(it) }
        }
    }
}
