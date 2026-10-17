package com.saferoute.shield

import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import androidx.core.app.NotificationCompat

/**
 * The shield's foreground-service notification. It is neutral on purpose: someone who sees the lock
 * screen or the shade learns only that Kakwe is installed, never what was checked.
 */
internal object ShieldNotification {
    const val TITLE = "Kakwe"
    const val TEXT = "Ready when you need it"
    const val CHANNEL_NAME = TITLE

    fun channelDescription(name: String = TITLE) = "Keeps $name ready"

    fun build(context: Context, channelId: String, contentIntent: PendingIntent?, title: String = TITLE, text: String = TEXT): Notification {
        val public = NotificationCompat.Builder(context, channelId)
            .setContentTitle(title)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .build()
        return NotificationCompat.Builder(context, channelId)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setPublicVersion(public)
            .apply { contentIntent?.let { setContentIntent(it) } }
            .build()
    }
}
