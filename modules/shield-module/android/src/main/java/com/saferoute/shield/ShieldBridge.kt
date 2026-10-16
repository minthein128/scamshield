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
    /** The user's opt-in to share scam patterns from screen checks. Off until the app says otherwise. */
    @Volatile var shareSignals: Boolean = false
    @Volatile var homeCountry: String? = null
    @Volatile var destinationCountry: String? = null
    @Volatile var strings: ShieldStrings = ShieldStrings.DEFAULT

    /** ISO 3166 alpha-2, upper case, or null. */
    fun countryCode(value: Any?): String? =
        (value as? String)?.trim()?.uppercase()?.takeIf { it.matches(Regex("^[A-Z]{2}$")) }

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
