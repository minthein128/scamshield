package com.saferoute.shield

import android.content.Intent

object ShieldBridge {
    class Consent(val resultCode: Int, val data: Intent)

    const val EXTRA_RESULT_JSON = "shieldResultJson"
    private const val MAX_RECENT = 20

    @Volatile var pendingConsent: Consent? = null
    @Volatile var consentCallback: ((Boolean) -> Unit)? = null
    @Volatile var eventSink: ((String, String) -> Unit)? = null
    @Volatile var authToken: String = ""

    private val unsynced = ArrayList<String>()
    private val recent = LinkedHashMap<String, String>()

    fun hasProjection(): Boolean = pendingConsent != null || ShieldService.instance?.hasProjection() == true

    @Synchronized
    fun publishResult(id: String, json: String) {
        recent[id] = json
        while (recent.size > MAX_RECENT) {
            recent.remove(recent.keys.first())
        }
        val sink = eventSink
        if (sink != null) {
            sink(id, json)
        } else {
            unsynced.add(json)
        }
    }

    @Synchronized
    fun takeUnsynced(): List<String> {
        val out = ArrayList(unsynced)
        unsynced.clear()
        return out
    }

    @Synchronized
    fun recentResult(id: String): String? = recent[id]
}
