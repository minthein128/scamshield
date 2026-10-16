package com.saferoute.shield

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject

/**
 * Posts a discreet notice for a careful or high-risk message. The notice never names the verdict
 * or quotes the message, so a person who sees the phone learns only that SafeRoute has a note.
 */
internal object MessageGuardNotifier {
    const val CHANNEL = "saferoute_notices"
    private val OLD_CHANNELS = listOf("saferoute_warnings", "saferoute_warnings_careful")
    private const val TAG = "saferoute_message"

    const val TITLE = "SafeRoute"
    const val BODY = "A message may need a second look. Open to see why."
    const val OPEN = "Open"

    fun stateFor(verdict: String): ShieldOverlay.State? = when (verdict) {
        "danger" -> ShieldOverlay.State.DANGER
        "careful" -> ShieldOverlay.State.CAREFUL
        else -> null
    }

    fun reportUri(id: String): Uri = Uri.parse("saferoute://report/" + Uri.encode(id))

    fun build(context: Context, result: JSONObject, body: String? = null, open: String? = null): Notification? {
        stateFor(result.optString("verdict")) ?: return null
        val id = result.optString("id").ifBlank { return null }
        val text = body?.takeIf { it.isNotBlank() } ?: BODY
        val intent = PendingIntent.getActivity(
            context,
            id.hashCode(),
            Intent(Intent.ACTION_VIEW, reportUri(id))
                .setPackage(context.packageName)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra(ShieldBridge.EXTRA_RESULT_JSON, result.toString()),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val public = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(TITLE)
            .build()
        return NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(TITLE)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setPublicVersion(public)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(intent)
            .addAction(0, open?.takeIf { it.isNotBlank() } ?: OPEN, intent)
            .build()
    }

    fun post(context: Context, result: JSONObject, body: String? = null, open: String? = null) {
        val manager = NotificationManagerCompat.from(context)
        if (!manager.areNotificationsEnabled()) return
        createChannel(context)
        val notification = build(context, result, body, open) ?: return
        try {
            manager.notify(TAG, result.optString("id").hashCode(), notification)
        } catch (_: SecurityException) {
            return
        }
        ShieldHaptics.careful(context)
    }

    private fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        OLD_CHANNELS.forEach { manager.deleteNotificationChannel(it) }
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL, TITLE, NotificationManager.IMPORTANCE_DEFAULT).apply {
                lockscreenVisibility = Notification.VISIBILITY_PRIVATE
            }
        )
    }
}
