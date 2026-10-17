package com.saferoute.shield

import android.content.Intent
import android.os.Build

object ShieldBridge {
    class Consent(val resultCode: Int, val data: Intent) {
        /** Projections opened from this result. */
        @Volatile var uses = 0
    }

    const val EXTRA_RESULT_JSON = "shieldResultJson"
    private const val MAX_RECENT = 20

    /** Screen-capture consent for the next projection. On Android 13 and lower it stays after use. */
    @Volatile var pendingConsent: Consent? = null
    @Volatile var consentCallback: ((Boolean) -> Unit)? = null
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

    fun hasProjection(): Boolean = pendingConsent != null || ShieldService.instance?.hasProjection() == true

    /**
     * Android 13 and lower open a new projection from the same consent after the last one stopped,
     * so the system dialog shows once per app process. Android 14 needs a new consent every time.
     */
    val keepsConsent: Boolean get() = Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE

    /** The consent to open a projection with. Android 14 and up use it once. */
    @Synchronized
    fun takeConsent(): Consent? {
        val consent = pendingConsent ?: return null
        if (!keepsConsent) pendingConsent = null
        consent.uses++
        return consent
    }

    @Synchronized
    fun forgetConsent(consent: Consent?) {
        if (consent == null || pendingConsent === consent) pendingConsent = null
    }

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

    fun publishRunning(running: Boolean) {
        stateSink?.invoke(running)
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
