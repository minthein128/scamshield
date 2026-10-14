package com.saferoute.shield

import android.content.Context
import android.os.Build
import android.provider.Telephony

/** The only apps whose notifications Message Guard may read. */
internal object MessageApps {
    class App(val id: String, val label: String, val packages: Set<String>)

    const val SMS_ID = "sms"

    val catalog: List<App> = listOf(
        App("messages", "Google Messages", setOf("com.google.android.apps.messaging")),
        App("whatsapp", "WhatsApp", setOf("com.whatsapp", "com.whatsapp.w4b")),
        App("viber", "Viber", setOf("com.viber.voip")),
        App("telegram", "Telegram", setOf("org.telegram.messenger", "org.telegram.messenger.web")),
        App("line", "LINE", setOf("jp.naver.line.android")),
        App("messenger", "Messenger", setOf("com.facebook.orca")),
        App("zalo", "Zalo", setOf("com.zing.zalo")),
        App("signal", "Signal", setOf("org.thoughtcrime.securesms")),
    )

    private fun ownerOf(pkg: String?): App? = catalog.firstOrNull { pkg in it.packages }

    /** Package names to watch. A null enabled set means every app. */
    fun watchedPackages(defaultSms: String?, enabledIds: Set<String>?): Set<String> {
        val out = HashSet<String>()
        for (app in catalog) if (enabledIds == null || app.id in enabledIds) out.addAll(app.packages)
        val smsOn = enabledIds == null || SMS_ID in enabledIds
        if (smsOn && defaultSms != null && ownerOf(defaultSms) == null) out.add(defaultSms)
        return out
    }

    fun defaultSmsPackage(context: Context): String? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            try {
                Telephony.Sms.getDefaultSmsPackage(context)
            } catch (_: Exception) {
                null
            }
        } else {
            null
        }

    fun isWatched(context: Context, pkg: String, enabledIds: Set<String>?): Boolean =
        pkg in watchedPackages(defaultSmsPackage(context), enabledIds)

    /** Rows for the settings list. The SMS row appears only when the default SMS app is not in the catalog. */
    fun rows(context: Context, enabledIds: Set<String>?): List<Triple<String, String, Boolean>> {
        val rows = ArrayList<Triple<String, String, Boolean>>()
        val sms = defaultSmsPackage(context)
        if (sms != null && ownerOf(sms) == null) {
            val label = try {
                context.packageManager.getApplicationLabel(context.packageManager.getApplicationInfo(sms, 0)).toString()
            } catch (_: Exception) {
                "Default SMS app"
            }
            rows.add(Triple(SMS_ID, "$label (SMS)", enabledIds == null || SMS_ID in enabledIds))
        }
        for (app in catalog) rows.add(Triple(app.id, app.label, enabledIds == null || app.id in enabledIds))
        return rows
    }
}
