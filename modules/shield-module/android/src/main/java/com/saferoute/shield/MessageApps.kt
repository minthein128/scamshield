package com.saferoute.shield

import android.content.Context
import android.os.Build
import android.provider.Telephony

/** The only apps whose notifications Message Guard may read. Chat and SMS apps only, never email or banking. */
internal object MessageApps {
    class App(val id: String, val label: String, val packages: Set<String>)

    class Row(val id: String, val label: String, val enabled: Boolean, val recommended: Boolean)

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

    val knownIds: Set<String> = catalog.map { it.id }.toSet() + SMS_ID

    private fun ownerOf(pkg: String?): App? = catalog.firstOrNull { pkg in it.packages }

    /** Package names to watch. Only apps the user turned on; an empty set watches nothing. */
    fun watchedPackages(defaultSms: String?, enabledIds: Set<String>): Set<String> {
        val out = HashSet<String>()
        for (app in catalog) if (app.id in enabledIds) out.addAll(app.packages)
        if (SMS_ID in enabledIds && defaultSms != null && ownerOf(defaultSms) == null) out.add(defaultSms)
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

    fun isWatched(context: Context, pkg: String, enabledIds: Set<String>): Boolean =
        pkg in watchedPackages(defaultSmsPackage(context), enabledIds)

    /** Name shown in the transparency log for a watched package. */
    fun labelFor(context: Context, pkg: String): String =
        ownerOf(pkg)?.label ?: appLabel(context, pkg) ?: "SMS"

    private fun appLabel(context: Context, pkg: String): String? = try {
        context.packageManager.getApplicationLabel(context.packageManager.getApplicationInfo(pkg, 0)).toString()
    } catch (_: Exception) {
        null
    }

    fun rows(context: Context, enabledIds: Set<String>): List<Row> {
        val sms = defaultSmsPackage(context)
        return rows(sms, sms?.let { appLabel(context, it) }, enabledIds)
    }

    /** Settings rows. The SMS app comes first and is marked recommended; nothing is on unless the user chose it. */
    fun rows(defaultSms: String?, smsLabel: String?, enabledIds: Set<String>): List<Row> {
        val out = ArrayList<Row>()
        val owner = ownerOf(defaultSms)
        if (defaultSms != null && owner == null) {
            out.add(Row(SMS_ID, "${smsLabel ?: "SMS"} (SMS)", SMS_ID in enabledIds, true))
        }
        if (owner != null) out.add(Row(owner.id, owner.label, owner.id in enabledIds, true))
        for (app in catalog) if (app !== owner) out.add(Row(app.id, app.label, app.id in enabledIds, false))
        return out
    }
}
