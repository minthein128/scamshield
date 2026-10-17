package com.saferoute.shield

import android.content.Intent

object ShieldBridge {
    /** One screen-capture consent result. It opens the projection for one shield session and is then dropped. */
    class Consent(val resultCode: Int, val data: Intent)

    const val EXTRA_RESULT_JSON = "shieldResultJson"
    private const val MAX_RECENT = 20

    @Volatile var eventSink: ((String, String) -> Unit)? = null
    /** Told when the service has actually started or stopped. */
    @Volatile var stateSink: ((Boolean) -> Unit)? = null
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

    private val stateListeners = java.util.concurrent.CopyOnWriteArraySet<(Boolean) -> Unit>()

    /** Extra state listeners, such as the Quick Settings tile while the shade is open. */
    fun addStateListener(listener: (Boolean) -> Unit) {
        stateListeners.add(listener)
    }

    fun removeStateListener(listener: (Boolean) -> Unit) {
        stateListeners.remove(listener)
    }

    fun publishRunning(running: Boolean) {
        stateSink?.invoke(running)
        stateListeners.forEach { it(running) }
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
