package com.saferoute.shield

import android.content.Context
import org.json.JSONObject

/**
 * The app's last shield start options, kept so the Quick Settings tile can start the shield while
 * the app is closed. The auth token is never stored; tile starts run without it until the app opens.
 */
internal data class ShieldStartConfig(
    val apiUrl: String,
    val fallbackApiUrl: String = "",
    val language: String? = null,
    val shareSignals: Boolean = false,
    val home: String? = null,
    val destination: String? = null,
    val strings: Map<String, String> = emptyMap()
) {
    companion object {
        private const val PREFS = "kakwe_shield_start"
        private const val KEY_API = "apiUrl"
        private const val KEY_FALLBACK = "fallbackApiUrl"
        private const val KEY_LANGUAGE = "language"
        private const val KEY_SHARE = "shareSignals"
        private const val KEY_HOME = "home"
        private const val KEY_DESTINATION = "destination"
        private const val KEY_STRINGS = "strings"

        /** Builds a config from the options of `startShield`. Unknown or blank strings are dropped. */
        fun fromOptions(options: Map<String, Any?>?): ShieldStartConfig {
            @Suppress("UNCHECKED_CAST")
            val rawStrings = options?.get("strings") as? Map<String, Any?>
            return ShieldStartConfig(
                apiUrl = (options?.get("apiUrl") as? String).orEmpty(),
                fallbackApiUrl = (options?.get("fallbackApiUrl") as? String).orEmpty(),
                language = (options?.get("language") as? String)?.takeIf { it.isNotBlank() },
                shareSignals = options?.get("shareSignals") == true,
                home = ShieldBridge.countryCode(options?.get("home")),
                destination = ShieldBridge.countryCode(options?.get("destination")),
                strings = if (rawStrings == null) emptyMap() else ShieldStrings.from(rawStrings).overrides()
            )
        }

        fun save(context: Context, config: ShieldStartConfig) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString(KEY_API, config.apiUrl)
                .putString(KEY_FALLBACK, config.fallbackApiUrl)
                .putString(KEY_LANGUAGE, config.language)
                .putBoolean(KEY_SHARE, config.shareSignals)
                .putString(KEY_HOME, config.home)
                .putString(KEY_DESTINATION, config.destination)
                .putString(KEY_STRINGS, JSONObject(config.strings).toString())
                .apply()
        }

        /** The saved config, or null when the app never started the shield with a service address. */
        fun load(context: Context): ShieldStartConfig? {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val api = prefs.getString(KEY_API, null)?.takeIf { it.isNotBlank() } ?: return null
            val strings = runCatching {
                val json = JSONObject(prefs.getString(KEY_STRINGS, null) ?: "{}")
                json.keys().asSequence().associateWith { json.getString(it) }
            }.getOrDefault(emptyMap())
            return ShieldStartConfig(
                apiUrl = api,
                fallbackApiUrl = prefs.getString(KEY_FALLBACK, null).orEmpty(),
                language = prefs.getString(KEY_LANGUAGE, null),
                shareSignals = prefs.getBoolean(KEY_SHARE, false),
                home = prefs.getString(KEY_HOME, null),
                destination = prefs.getString(KEY_DESTINATION, null),
                strings = ShieldStrings.from(strings).overrides()
            )
        }

        fun saveShareSignals(context: Context, enabled: Boolean) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY_SHARE, enabled).apply()
        }
    }
}
