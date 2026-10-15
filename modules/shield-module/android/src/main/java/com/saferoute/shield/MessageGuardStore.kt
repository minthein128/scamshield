package com.saferoute.shield

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/** Message Guard settings and recent warning results. App-private storage. */
internal class MessageGuardStore(context: Context) {
    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    var enabled: Boolean
        get() = prefs.getBoolean("enabled", false)
        set(v) = prefs.edit().putBoolean("enabled", v).apply()

    /** Null means every app in the catalog is on. */
    var enabledApps: Set<String>?
        get() = prefs.getStringSet("apps", null)?.toSet()
        set(v) = prefs.edit().apply { if (v == null) remove("apps") else putStringSet("apps", v) }.apply()

    var apiUrl: String
        get() = prefs.getString("apiUrl", "").orEmpty()
        set(v) = prefs.edit().putString("apiUrl", v).apply()

    var language: String
        get() = prefs.getString("language", "en").orEmpty().ifBlank { "en" }
        set(v) = prefs.edit().putString("language", v).apply()

    var shareSignals: Boolean
        get() = prefs.getBoolean("shareSignals", true)
        set(v) = prefs.edit().putBoolean("shareSignals", v).apply()

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
        prefs.edit().putString("results", arr.toString()).apply()
    }

    @Synchronized
    fun result(id: String): String? = loadResults().firstOrNull { it.first == id }?.second

    private fun loadResults(): List<Pair<String, String>> {
        val raw = prefs.getString("results", null) ?: return emptyList()
        return try {
            val arr = JSONArray(raw)
            (0 until arr.length()).map { arr.getJSONObject(it).let { o -> o.getString("id") to o.getString("json") } }
        } catch (_: Exception) {
            emptyList()
        }
    }

    companion object {
        private const val FILE = "saferoute_message_guard"
        private const val MAX_RESULTS = 20
    }
}
