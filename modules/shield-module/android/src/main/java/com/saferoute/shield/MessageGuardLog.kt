package com.saferoute.shield

import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * On-device record of what Message Guard sent: the time, the app, the exact redacted text and the
 * verdict. Lives in the app's no-backup directory, so Android backup never copies it off the phone.
 */
internal class MessageGuardLog(private val file: File, private val now: () -> Long = System::currentTimeMillis) {

    class Entry(val id: String, val at: Long, val app: String, val text: String, val verdict: String) {
        fun toMap(): Map<String, Any> = mapOf("id" to id, "at" to at.toDouble(), "app" to app, "text" to text, "verdict" to verdict)
    }

    @Synchronized
    fun add(app: String, text: String): String {
        val t = now()
        val id = "log_${t}_${(0..0xffff).random().toString(16)}"
        save(load() + Entry(id, t, app, text, PENDING))
        return id
    }

    @Synchronized
    fun setVerdict(id: String, verdict: String) {
        save(load().map { if (it.id == id) Entry(it.id, it.at, it.app, it.text, verdict) else it })
    }

    /** Newest first, older than seven days already removed. */
    @Synchronized
    fun entries(): List<Entry> {
        val list = load()
        val kept = prune(list)
        if (kept.size != list.size) save(kept)
        return kept.sortedByDescending { it.at }
    }

    @Synchronized
    fun clear() {
        file.delete()
    }

    private fun prune(list: List<Entry>): List<Entry> {
        val t = now()
        return list.filter { t - it.at < MAX_AGE_MS && it.at <= t + CLOCK_SLACK_MS }.sortedBy { it.at }.takeLast(MAX_ENTRIES)
    }

    private fun load(): List<Entry> {
        if (!file.exists()) return emptyList()
        return try {
            val arr = JSONArray(file.readText(Charsets.UTF_8))
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                Entry(o.getString("id"), o.getLong("at"), o.optString("app"), o.optString("text"), o.optString("verdict", PENDING))
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun save(list: List<Entry>) {
        val arr = JSONArray()
        prune(list).forEach {
            arr.put(JSONObject().put("id", it.id).put("at", it.at).put("app", it.app).put("text", it.text).put("verdict", it.verdict))
        }
        file.parentFile?.mkdirs()
        val tmp = File(file.path + ".tmp")
        tmp.writeText(arr.toString(), Charsets.UTF_8)
        if (!tmp.renameTo(file)) {
            file.writeText(arr.toString(), Charsets.UTF_8)
            tmp.delete()
        }
    }

    companion object {
        const val MAX_ENTRIES = 50
        const val MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000L
        const val PENDING = "pending"
        const val FAILED = "failed"
        private const val CLOCK_SLACK_MS = 60 * 60 * 1000L
    }
}
