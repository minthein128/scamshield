package com.saferoute.shield

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat

/** Message Guard calls behind the Expo module functions. Keeps consent rules out of ShieldModule. */
internal object MessageGuardBridge {

    fun status(context: Context): Map<String, Any?> {
        val store = MessageGuardStore(context)
        val access = hasAccess(context)
        if (store.enabled && access && !MessageGuardListener.connected) MessageGuardListener.rebind(context)
        return mapOf(
            "enabled" to store.enabled,
            "consent" to store.hasConsent,
            "pausedReason" to store.pausedReason,
            "listenerConnected" to MessageGuardListener.connected,
            "notificationsEnabled" to MessageGuardNotifier.canNotify(context),
            "batteryOptimized" to isBatteryOptimized(context),
            "missingApps" to MessageApps.missingApps(context, store.enabledApps),
            "last" to store.activity.last()?.let { it.toMap(MessageApps.labelForId(context, it.app)) },
        )
    }

    fun hasAccess(context: Context): Boolean =
        NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)

    /** True when Android may stop Kakwe in the background to save battery. */
    fun isBatteryOptimized(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false
        val power = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return false
        return !power.isIgnoringBatteryOptimizations(context.packageName)
    }

    /** Opens the battery optimisation list, or Kakwe's App info when a phone hides that list. */
    fun openBatterySettings(context: Context): Boolean {
        val intents = listOfNotNull(
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS) else null,
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + context.packageName)),
        )
        for (intent in intents) {
            try {
                context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                return true
            } catch (_: Exception) {
                continue
            }
        }
        return false
    }

    /** Decision events after [afterSeq], oldest first, plus counts per outcome. Codes only, no content. */
    fun activity(context: Context, afterSeq: Long): Map<String, Any?> {
        val store = MessageGuardStore(context)
        return mapOf(
            "events" to store.activity.events(afterSeq).map { it.toMap(MessageApps.labelForId(context, it.app)) },
            "counts" to store.activity.counts().mapValues { it.value.toDouble() },
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
        (options["noticeTitle"] as? String)?.let { store.noticeTitle = it.take(40) }
        (options["noticeOpen"] as? String)?.let { store.noticeOpen = it.take(30) }
        return true
    }

    fun log(context: Context): List<Map<String, Any>> = MessageGuardStore(context).log.entries().map { it.toMap() }

    fun clearLog(context: Context): Boolean {
        MessageGuardStore(context).log.clear()
        return true
    }
}
