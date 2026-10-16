package com.saferoute.shield

import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * What Message Guard decided for each notification from a chosen app: the time, the app id and
 * one outcome code. It never holds message text, the sender or the title.
 */
internal class MessageGuardActivity(private val file: File, private val now: () -> Long = System::currentTimeMillis) {

    class Event(val seq: Long, val at: Long, val app: String, val outcome: String) {
        fun toMap(label: String?): Map<String, Any?> =
            mapOf("seq" to seq.toDouble(), "at" to at.toDouble(), "app" to app, "label" to label, "outcome" to outcome)
    }

    /** Adds one event and returns its sequence number, so a later result can replace "sent". */
    fun record(app: String, outcome: String): Long = synchronized(LOCK) {
        val state = load()
        val seq = state.nextSeq
        val events = prune(state.events + Event(seq, now(), safeId(app), safeOutcome(outcome)))
        save(State(seq + 1, events, bump(state.counts, outcome)))
        seq
    }

    /** Counts an outcome without adding an event, for notifications that always come with another one. */
    fun count(outcome: String) = synchronized(LOCK) {
        val state = load()
        save(State(state.nextSeq, state.events, bump(state.counts, outcome)))
    }

    /** Replaces the outcome of one event, for example "sent" with "result:safe". */
    fun update(seq: Long, outcome: String) = synchronized(LOCK) {
        val state = load()
        val events = state.events.map { if (it.seq == seq) Event(it.seq, it.at, it.app, safeOutcome(outcome)) else it }
        save(State(state.nextSeq, events, bump(state.counts, outcome)))
    }

    /** Events with a sequence number above [afterSeq], oldest first. */
    fun events(afterSeq: Long = -1): List<Event> = synchronized(LOCK) { prune(load().events).filter { it.seq > afterSeq } }

    fun last(): Event? = synchronized(LOCK) { prune(load().events).lastOrNull() }

    /** The number the next event gets. A reader whose cursor is at or above it lost the file. */
    fun nextSeq(): Long = synchronized(LOCK) { load().nextSeq }

    fun counts(): Map<String, Int> = synchronized(LOCK) { load().counts }

    /** Drops events and counts but keeps the sequence, so a reader's cursor stays valid. */
    fun clear() = synchronized(LOCK) {
        save(State(load().nextSeq, emptyList(), emptyMap()))
    }

    private class State(val nextSeq: Long, val events: List<Event>, val counts: Map<String, Int>)

    private fun bump(counts: Map<String, Int>, outcome: String): Map<String, Int> {
        val key = safeOutcome(outcome)
        return counts + (key to (counts[key] ?: 0) + 1)
    }

    private fun prune(list: List<Event>): List<Event> {
        val t = now()
        return list.filter { t - it.at < MAX_AGE_MS }.takeLast(MAX_EVENTS)
    }

    private fun load(): State {
        if (!file.exists()) return State(0, emptyList(), emptyMap())
        return try {
            val root = JSONObject(file.readText(Charsets.UTF_8))
            val arr = root.optJSONArray("events") ?: JSONArray()
            val events = (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                Event(o.getLong("seq"), o.getLong("at"), o.optString("app"), o.optString("outcome"))
            }.filter { it.outcome != LEGACY_NOT_CHOSEN }
            val counts = HashMap<String, Int>()
            root.optJSONObject("counts")?.let { c -> c.keys().forEach { counts[it] = c.optInt(it) } }
            counts.remove(LEGACY_NOT_CHOSEN)
            State(root.optLong("nextSeq", (events.maxOfOrNull { it.seq } ?: -1) + 1), events, counts)
        } catch (_: Exception) {
            State(0, emptyList(), emptyMap())
        }
    }

    private fun save(state: State) {
        val arr = JSONArray()
        state.events.forEach {
            arr.put(JSONObject().put("seq", it.seq).put("at", it.at).put("app", it.app).put("outcome", it.outcome))
        }
        val counts = JSONObject()
        state.counts.forEach { (k, v) -> counts.put(k, v) }
        val root = JSONObject().put("nextSeq", state.nextSeq).put("events", arr).put("counts", counts)
        file.parentFile?.mkdirs()
        val tmp = File(file.path + ".tmp")
        tmp.writeText(root.toString(), Charsets.UTF_8)
        if (!tmp.renameTo(file)) {
            file.writeText(root.toString(), Charsets.UTF_8)
            tmp.delete()
        }
    }

    companion object {
        private val LOCK = Any()
        const val MAX_EVENTS = 100
        const val MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000L

        /** Earlier builds wrote this for apps the user did not choose; it is dropped on read. */
        private const val LEGACY_NOT_CHOSEN = "skipped_app_not_chosen"
        const val SKIPPED_PAUSED = "skipped_paused"
        const val SKIPPED_SUMMARY = "skipped_summary"
        const val SKIPPED_ONGOING = "skipped_ongoing"
        const val SKIPPED_SELF = "skipped_self"
        const val SKIPPED_NO_TEXT = "skipped_no_text"
        const val SKIPPED_HIDDEN_PREVIEW = "skipped_hidden_preview"
        const val SKIPPED_TOO_SHORT = "skipped_too_short"
        const val SKIPPED_OTP = "skipped_otp"
        const val SKIPPED_NOT_RISKY = "skipped_not_risky"
        const val SKIPPED_DUPLICATE = "skipped_duplicate"
        const val SKIPPED_RATE_LIMITED = "skipped_rate_limited"
        const val SENT = "sent"
        const val CHECK_FAILED = "check_failed"
        const val RESULT = "result"
        const val NOTICE_BLOCKED = "notice_blocked"

        private val SAFE = Regex("[^a-z0-9_:]")

        fun checkFailed(kind: String) = "$CHECK_FAILED:$kind"

        fun result(verdict: String, shown: Boolean? = null): String {
            val v = verdict.lowercase().ifBlank { "unknown" }
            return if (shown == false) "$RESULT:$v:$NOTICE_BLOCKED" else "$RESULT:$v"
        }

        /** Maps an engine or prefilter skip reason to its outcome code. */
        fun forSkip(reason: String): String = when (reason) {
            MessagePrefilter.SKIP_SHORT -> SKIPPED_TOO_SHORT
            MessagePrefilter.SKIP_OTP -> SKIPPED_OTP
            MessagePrefilter.SKIP_LOW -> SKIPPED_NOT_RISKY
            MessageGuardEngine.SKIP_DUPLICATE -> SKIPPED_DUPLICATE
            MessageGuardEngine.SKIP_HOURLY, MessageGuardEngine.SKIP_DAILY -> SKIPPED_RATE_LIMITED
            else -> "skipped_" + safeOutcome(reason)
        }

        fun safeOutcome(outcome: String): String = SAFE.replace(outcome.lowercase(), "_").take(40)

        private fun safeId(app: String): String = SAFE.replace(app.lowercase(), "_").take(24)
    }
}
