package com.saferoute.shield

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

/** Posts the SafeRoute warning notification for a careful or high-risk message. */
internal object MessageGuardNotifier {
    const val CHANNEL_DANGER = "saferoute_warnings"
    const val CHANNEL_CAREFUL = "saferoute_warnings_careful"
    private const val TAG = "saferoute_message"

    fun stateFor(verdict: String): ShieldOverlay.State? = when (verdict) {
        "danger" -> ShieldOverlay.State.DANGER
        "careful" -> ShieldOverlay.State.CAREFUL
        else -> null
    }

    fun reportUri(id: String): Uri = Uri.parse("saferoute://report/" + Uri.encode(id))

    fun post(context: Context, result: JSONObject) {
        val state = stateFor(result.optString("verdict")) ?: return
        val id = result.optString("id").ifBlank { return }
        val manager = NotificationManagerCompat.from(context)
        if (!manager.areNotificationsEnabled()) return
        createChannels(context)

        val palette = ShieldPalette.forContext(context)
        val chip = ShieldPalette.chipLabel(state)
        val title = result.optString("title").ifBlank { "This message looks risky" }.take(80)
        val summary = result.optString("summary").take(160)
        val open = PendingIntent.getActivity(
            context,
            id.hashCode(),
            Intent(Intent.ACTION_VIEW, reportUri(id))
                .setPackage(context.packageName)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra(ShieldBridge.EXTRA_RESULT_JSON, result.toString()),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val danger = state == ShieldOverlay.State.DANGER
        val builder = NotificationCompat.Builder(context, if (danger) CHANNEL_DANGER else CHANNEL_CAREFUL)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("$chip: $title")
            .setContentText(summary)
            .setStyle(NotificationCompat.BigTextStyle().bigText(summary))
            .setSubText("SafeRoute Message Guard")
            .setColor(palette.ring(state))
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setPriority(if (danger) NotificationCompat.PRIORITY_HIGH else NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(open)
            .addAction(0, "Open report", open)
        try {
            manager.notify(TAG, id.hashCode(), builder.build())
        } catch (_: SecurityException) {
            return
        }
        if (danger) ShieldHaptics.danger(context) else ShieldHaptics.careful(context)
    }

    private fun createChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_DANGER, "SafeRoute warnings", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Warns you when a message looks like a scam"
            }
        )
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_CAREFUL, "SafeRoute cautions", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Tells you when a message needs a second look"
            }
        )
    }
}
