package com.saferoute.shield

import android.content.Context

/** Message Guard calls behind the Expo module functions. Keeps consent rules out of ShieldModule. */
internal object MessageGuardBridge {

    fun status(context: Context): Map<String, Any?> {
        val store = MessageGuardStore(context)
        return mapOf(
            "enabled" to store.enabled,
            "consent" to store.hasConsent,
            "pausedReason" to store.pausedReason,
        )
    }

    fun setEnabled(context: Context, enabled: Boolean): Boolean {
        val store = MessageGuardStore(context)
        if (!enabled) {
            store.turnOff()
            return true
        }
        val on = store.turnOn()
        if (on) MessageGuardListener.rebind(context)
        return on
    }

    fun grantConsent(context: Context, ids: List<String>): Boolean {
        val chosen = ids.filter { it in MessageApps.knownIds }
        if (chosen.isEmpty()) return false
        MessageGuardStore(context).grantConsent(chosen)
        return true
    }

    fun keepApps(context: Context, ids: List<String>): Boolean {
        MessageGuardStore(context).keepApps(ids)
        return true
    }

    fun apps(context: Context): List<Map<String, Any>> =
        MessageApps.rows(context, MessageGuardStore(context).enabledApps).map {
            mapOf("id" to it.id, "label" to it.label, "enabled" to it.enabled, "recommended" to it.recommended)
        }

    fun configure(context: Context, options: Map<String, Any?>): Boolean {
        val store = MessageGuardStore(context)
        (options["apiUrl"] as? String)?.let { store.apiUrl = it }
        (options["language"] as? String)?.let { if (it.isNotBlank()) store.language = it }
        (options["shareSignals"] as? Boolean)?.let { store.shareSignals = it }
        (options["noticeBody"] as? String)?.let { store.noticeBody = it.take(120) }
        (options["noticeOpen"] as? String)?.let { store.noticeOpen = it.take(30) }
        return true
    }

    fun log(context: Context): List<Map<String, Any>> = MessageGuardStore(context).log.entries().map { it.toMap() }

    fun clearLog(context: Context): Boolean {
        MessageGuardStore(context).log.clear()
        return true
    }
}
