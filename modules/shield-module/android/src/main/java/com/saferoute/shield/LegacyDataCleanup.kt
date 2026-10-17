package com.saferoute.shield

import android.app.NotificationManager
import android.content.Context
import android.os.Build
import java.io.File

/** Deletes data an earlier notification-reading feature left on the phone. Runs once, never throws. */
internal object LegacyDataCleanup {
    private const val FLAG_PREFS = "kakwe_shield_maintenance"
    private const val FLAG_KEY = "legacyMessageDataCleaned"

    // Legacy names: dir message_guard (results, sent_log, activity .json), prefs saferoute_message_guard.
    internal const val LEGACY_DIR = "message_guard"
    internal const val LEGACY_PREFS = "saferoute_message_guard"
    internal val LEGACY_CHANNELS = listOf("saferoute_notices", "saferoute_warnings", "saferoute_warnings_careful")

    fun run(context: Context) {
        try {
            val app = context.applicationContext ?: context
            val flags = app.getSharedPreferences(FLAG_PREFS, Context.MODE_PRIVATE)
            if (flags.getBoolean(FLAG_KEY, false)) return
            val ok = listOf(
                attempt { deleteDirs(app) },
                attempt { deletePrefs(app) },
                attempt { deleteChannels(app) },
            ).all { it }
            if (ok) flags.edit().putBoolean(FLAG_KEY, true).apply()
        } catch (_: Throwable) {
        }
    }

    private fun attempt(step: () -> Unit): Boolean = try {
        step()
        true
    } catch (_: Throwable) {
        false
    }

    private fun deleteDirs(context: Context) {
        for (base in listOf(context.noBackupFilesDir, context.filesDir)) {
            val dir = File(base, LEGACY_DIR)
            if (dir.exists() && !dir.deleteRecursively()) error("could not delete $dir")
        }
    }

    private fun deletePrefs(context: Context) {
        context.getSharedPreferences(LEGACY_PREFS, Context.MODE_PRIVATE).edit().clear().commit()
        context.deleteSharedPreferences(LEGACY_PREFS)
    }

    private fun deleteChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        LEGACY_CHANNELS.forEach { manager.deleteNotificationChannel(it) }
    }
}
