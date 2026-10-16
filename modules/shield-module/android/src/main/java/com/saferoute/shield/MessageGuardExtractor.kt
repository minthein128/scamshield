package com.saferoute.shield

import android.app.Notification
import android.os.Bundle

/**
 * Reads the newest message text from a notification of a watched app. The sender, chat title and
 * other participants are kept only to score and scrub the text on the device.
 */
internal object MessageGuardExtractor {
    class Extracted(val text: String, val sender: String?, val names: List<String>)

    fun extract(notification: Notification): Extracted? {
        val extras = notification.extras ?: return null
        var text: String? = null
        var sender: String? = null
        val names = ArrayList<String>()

        @Suppress("DEPRECATION")
        val messages = extras.getParcelableArray(Notification.EXTRA_MESSAGES)
        messages?.forEach { m -> (m as? Bundle)?.getCharSequence("sender")?.toString()?.let(names::add) }
        val last = messages?.lastOrNull() as? Bundle
        if (last != null) {
            text = last.getCharSequence("text")?.toString()
            sender = last.getCharSequence("sender")?.toString()
        }
        if (text.isNullOrBlank()) {
            text = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
                ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
        }
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
        if (sender.isNullOrBlank()) sender = title
        listOfNotNull(
            title,
            extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString(),
        ).forEach(names::add)
        if (text.isNullOrBlank()) return null
        return Extracted(text, sender, names.filter { it.isNotBlank() }.distinct())
    }
}
