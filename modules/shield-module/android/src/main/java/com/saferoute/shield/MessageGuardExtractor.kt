package com.saferoute.shield

import android.app.Notification
import android.app.Person
import android.os.Build
import android.os.Bundle

/**
 * Reads the newest message text from a notification of a watched app. The sender, chat title and
 * other participants are kept only to score and scrub the text on the device.
 */
internal object MessageGuardExtractor {
    class Extracted(val text: String, val sender: String?, val names: List<String>)

    /** Either a message to score or the outcome code that explains why there is none. */
    sealed class Read {
        class Message(val message: Extracted) : Read()
        class Skip(val outcome: String) : Read()
    }

    fun extract(notification: Notification): Extracted? = (read(notification) as? Read.Message)?.message

    fun read(notification: Notification): Read {
        val extras = notification.extras ?: return Read.Skip(MessageGuardActivity.SKIPPED_NO_TEXT)
        var text: String? = null
        var sender: String? = null
        val names = ArrayList<String>()
        val self = selfName(extras)

        @Suppress("DEPRECATION")
        val messages = extras.getParcelableArray(Notification.EXTRA_MESSAGES)
        messages?.forEach { m -> (m as? Bundle)?.getCharSequence(KEY_SENDER)?.toString()?.let(names::add) }
        val last = messages?.lastOrNull() as? Bundle
        if (last != null) {
            if (isFromSelf(last, self)) return Read.Skip(MessageGuardActivity.SKIPPED_SELF)
            text = last.getCharSequence(KEY_TEXT)?.toString()
            sender = last.getCharSequence(KEY_SENDER)?.toString()
        }
        if (text.isNullOrBlank()) text = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
        if (text.isNullOrBlank()) {
            text = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
                ?.mapNotNull { it?.toString()?.takeIf(String::isNotBlank) }
                ?.lastOrNull()
        }
        if (text.isNullOrBlank()) text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
        if (sender.isNullOrBlank()) sender = title
        listOfNotNull(
            title,
            extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString(),
        ).forEach(names::add)
        if (text.isNullOrBlank()) return Read.Skip(MessageGuardActivity.SKIPPED_NO_TEXT)
        if (isPlaceholder(text, sender)) return Read.Skip(MessageGuardActivity.SKIPPED_HIDDEN_PREVIEW)
        return Read.Message(Extracted(text, sender, names.filter { it.isNotBlank() }.distinct()))
    }

    /** A MessagingStyle message with no sender is the user's own, as is one sent under the user's name. */
    private fun isFromSelf(message: Bundle, self: String?): Boolean {
        if (!message.containsKey(KEY_SENDER) && !message.containsKey(KEY_SENDER_PERSON)) return true
        val name = message.getCharSequence(KEY_SENDER)?.toString()?.trim()
        return !self.isNullOrBlank() && name != null && name == self.trim()
    }

    private fun selfName(extras: Bundle): String? {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val person = try {
                @Suppress("DEPRECATION")
                extras.getParcelable<Person>(Notification.EXTRA_MESSAGING_PERSON)
            } catch (_: Exception) {
                null
            }
            person?.name?.toString()?.takeIf { it.isNotBlank() }?.let { return it }
        }
        @Suppress("DEPRECATION")
        return extras.getCharSequence(Notification.EXTRA_SELF_DISPLAY_NAME)?.toString()
    }

    /** Text an app shows when its message preview is off. Nothing worth checking is in it. */
    fun isPlaceholder(text: String, sender: String? = null): Boolean {
        var t = MessagePrefilter.normalize(text).lowercase().trimEnd('.', '!', ' ')
        val s = sender?.trim()?.lowercase()
        if (!s.isNullOrEmpty() && t.startsWith(s)) t = t.removePrefix(s).trim()
        if (t in PLACEHOLDERS) return true
        return PLACEHOLDER_PATTERNS.any { it.matches(t) }
    }

    private const val KEY_TEXT = "text"
    private const val KEY_SENDER = "sender"
    private const val KEY_SENDER_PERSON = "sender_person"

    private val PLACEHOLDERS = setOf(
        "new message",
        "new messages",
        "message",
        "you have a new message",
        "you have new messages",
        "you have new message",
        "sent you a message",
        "sent a message",
        "contents hidden",
        "message hidden",
        "sensitive notification content hidden",
        "notification content hidden",
        "tap to view",
        "pesan baru",
        "ada pesan baru",
        "bagong mensahe",
        "may bagong mensahe",
        "ข้อความใหม่",
        "คุณมีข้อความใหม่",
    )

    private val PLACEHOLDER_PATTERNS = listOf(
        Regex("""\d+ new messages?( from \d+ chats?)?"""),
        Regex("""\d+ pesan baru"""),
        Regex("""\d+ bagong mensahe"""),
        Regex("""ข้อความใหม่ \d+ ข้อความ"""),
        Regex("""\d+ ข้อความใหม่"""),
    )
}
