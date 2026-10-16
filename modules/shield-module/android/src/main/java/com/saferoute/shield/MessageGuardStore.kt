package com.saferoute.shield

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Message Guard settings, consent and recent warning results. Settings live in app-private
 * preferences; message-derived data (results, the sent log) lives in the no-backup directory.
 */
internal class MessageGuardStore(context: Context, now: () -> Long = System::currentTimeMillis) {
    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)
    private val dir = File(context.applicationContext.noBackupFilesDir, DIR)
    private val resultsFile = File(dir, "results.json")
    private val clock = now

    val log = MessageGuardLog(File(dir, "sent_log.json"), now)

    init {
        if (prefs.contains("results")) prefs.edit().remove("results").apply()
    }

    /** True only with current consent, at least one chosen app and no pause. */
    val enabled: Boolean
        get() = prefs.getBoolean("enabled", false) && hasConsent && enabledApps.isNotEmpty() && pausedReason == null

    val hasConsent: Boolean
        get() = prefs.getInt("consentVersion", 0) >= CONSENT_VERSION

    /** Apps the user consented to. Empty until the user picks them; nothing is on by default. */
    val enabledApps: Set<String>
        get() = if (hasConsent) prefs.getStringSet("apps", null)?.toSet().orEmpty() else emptySet()

    val pausedReason: String?
        get() = prefs.getString("pausedReason", null)

    /** Records consent for exactly these apps. Adding an app later needs a new call. */
    fun grantConsent(appIds: Collection<String>) {
        val ids = appIds.filter { it in MessageApps.knownIds }.toSet()
        prefs.edit()
            .putInt("consentVersion", CONSENT_VERSION)
            .putLong("consentAt", clock())
            .putStringSet("apps", ids)
            .apply()
    }

    /** Turns Message Guard on. Refuses without consent for at least one app. */
    fun turnOn(): Boolean {
        if (!hasConsent || enabledApps.isEmpty()) return false
        prefs.edit().putBoolean("enabled", true).remove("pausedReason").remove("pausedAt").apply()
        return true
    }

    /** Turns Message Guard off and withdraws consent, so turning it on again asks again. */
    fun turnOff() {
        prefs.edit()
            .putBoolean("enabled", false)
            .remove("consentVersion")
            .remove("consentAt")
            .remove("apps")
            .remove("pausedReason")
            .remove("pausedAt")
            .apply()
    }

    /** Narrows the chosen apps. Apps outside the current consent are dropped. */
    fun keepApps(appIds: Collection<String>) {
        val allowed = enabledApps
        prefs.edit().putStringSet("apps", appIds.filter { it in allowed }.toSet()).apply()
    }

    fun pause(reason: String) {
        prefs.edit().putString("pausedReason", reason).putLong("pausedAt", clock()).apply()
    }

    var apiUrl: String
        get() = prefs.getString("apiUrl", "").orEmpty()
        set(v) = prefs.edit().putString("apiUrl", v).apply()

    var language: String
        get() = prefs.getString("language", "en").orEmpty().ifBlank { "en" }
        set(v) = prefs.edit().putString("language", v).apply()

    /** Off until the app passes the user's opt-in. */
    var shareSignals: Boolean
        get() = prefs.getBoolean("shareSignals", false)
        set(v) = prefs.edit().putBoolean("shareSignals", v).apply()

    /** Neutral notification body and button label in the user's language, set by the app. */
    var noticeBody: String?
        get() = prefs.getString("noticeBody", null)
        set(v) = prefs.edit().putString("noticeBody", v).apply()

    var noticeOpen: String?
        get() = prefs.getString("noticeOpen", null)
        set(v) = prefs.edit().putString("noticeOpen", v).apply()

    fun loadStamps(): List<Long> =
        prefs.getString("stamps", "").orEmpty().split(',').mapNotNull { it.toLongOrNull() }

    fun saveStamps(stamps: List<Long>) {
        prefs.edit().putString("stamps", stamps.joinToString(",")).apply()
    }

    @Synchronized
    fun saveResult(id: String, json: String) {
        val list = loadResults().filter { it.first != id }.toMutableList()
        list.add(id to json)
        while (list.size > MAX_RESULTS) list.removeAt(0)
        val arr = JSONArray()
        list.forEach { arr.put(JSONObject().put("id", it.first).put("json", it.second)) }
        dir.mkdirs()
        resultsFile.writeText(arr.toString(), Charsets.UTF_8)
    }

    @Synchronized
    fun result(id: String): String? = loadResults().firstOrNull { it.first == id }?.second

    private fun loadResults(): List<Pair<String, String>> {
        if (!resultsFile.exists()) return emptyList()
        return try {
            val arr = JSONArray(resultsFile.readText(Charsets.UTF_8))
            (0 until arr.length()).map { arr.getJSONObject(it).let { o -> o.getString("id") to o.getString("json") } }
        } catch (_: Exception) {
            emptyList()
        }
    }

    companion object {
        private const val FILE = "saferoute_message_guard"
        private const val DIR = "message_guard"
        private const val MAX_RESULTS = 20
        const val CONSENT_VERSION = 1
        const val PAUSE_DAILY = "daily_limit"
    }
}
