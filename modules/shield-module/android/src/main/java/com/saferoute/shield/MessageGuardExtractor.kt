package com.saferoute.shield

import android.app.Notification
import android.os.Bundle

/** Reads the newest message text and sender title from a notification of a watched app. */
internal object MessageGuardExtractor {
    class Extracted(val text: String, val sender: String?)

    fun extract(notification: Notification): Extracted? {
        val extras = notification.extras ?: return null
        var text: String? = null
        var sender: String? = null

        @Suppress("DEPRECATION")
        val messages = extras.getParcelableArray(Notification.EXTRA_MESSAGES)
        val last = messages?.lastOrNull() as? Bundle
        if (last != null) {
            text = last.getCharSequence("text")?.toString()
            sender = last.getCharSequence("sender")?.toString()
        }
        if (text.isNullOrBlank()) {
            text = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
                ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
        }
        if (sender.isNullOrBlank()) sender = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
        if (text.isNullOrBlank()) return null
        return Extracted(text, sender)
    }
}
