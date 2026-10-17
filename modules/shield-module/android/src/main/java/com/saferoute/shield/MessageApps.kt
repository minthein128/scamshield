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
        App("telegram", "Telegram", setOf("org.telegram.messenger", "org.telegram.messenger.web", "org.thunderdog.challegram")),
        App("line", "LINE", setOf("jp.naver.line.android")),
        App("messenger", "Messenger", setOf("com.facebook.orca")),
        App("zalo", "Zalo", setOf("com.zing.zalo")),
        App("signal", "Signal", setOf("org.thoughtcrime.securesms")),
    )

    /** Phone makers' SMS apps. Watched under "sms" with the default SMS app, so a changed or unknown default still works. */
    val oemSms: Set<String> = setOf(
        "com.samsung.android.messaging",
        "com.android.mms",
        "com.android.messaging",
        "com.oneplus.mms",
        "com.sonyericsson.conversations",
        "com.motorola.messaging",
        "com.htc.sense.mms",
    )

    val knownIds: Set<String> = catalog.map { it.id }.toSet() + SMS_ID

    private fun ownerOf(pkg: String?): App? = catalog.firstOrNull { pkg in it.packages }

    private fun smsPackages(defaultSms: String?): Set<String> =
        if (defaultSms != null && ownerOf(defaultSms) == null) oemSms + defaultSms else oemSms

    /** Package names to watch. Only apps the user turned on; an empty set watches nothing. */
    fun watchedPackages(defaultSms: String?, enabledIds: Set<String>): Set<String> {
        val out = HashSet<String>()
        for (app in catalog) if (app.id in enabledIds) out.addAll(app.packages)
        if (SMS_ID in enabledIds) out.addAll(smsPackages(defaultSms))
        return out
    }

    /** Short app id for a messaging package ("viber", "sms"), or null for any other app. */
    fun idFor(pkg: String, defaultSms: String?): String? =
        ownerOf(pkg)?.id ?: if (pkg in smsPackages(defaultSms)) SMS_ID else null

    /** Package names behind one app id. */
    fun packagesFor(id: String, defaultSms: String?): Set<String> =
        if (id == SMS_ID) smsPackages(defaultSms) else catalog.firstOrNull { it.id == id }?.packages.orEmpty()

    fun labelForId(context: Context, id: String): String =
        catalog.firstOrNull { it.id == id }?.label
            ?: (smsApp(context)?.let { appLabel(context, it) } ?: "SMS")

    /** The default SMS app, or the first installed phone maker's SMS app when Android does not name one. */
    fun smsApp(context: Context): String? =
        defaultSmsPackage(context) ?: oemSms.firstOrNull { isInstalled(context, it) }

    fun isInstalled(context: Context, pkg: String): Boolean = try {
        context.packageManager.getApplicationInfo(pkg, 0)
        true
    } catch (_: Exception) {
        false
    }

    /** Labels of chosen apps with no package installed on this phone. */
    fun missingApps(context: Context, enabledIds: Set<String>): List<String> {
        val sms = defaultSmsPackage(context)
        return enabledIds.filter { id ->
            if (id == SMS_ID && sms != null) return@filter false
            packagesFor(id, sms).none { isInstalled(context, it) }
        }.map { labelForId(context, it) }
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
        val sms = smsApp(context)
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
