package com.saferoute.shield

/** Voice companion labels. The app passes them in the user's language; English is the fallback. */
class ShieldStrings private constructor(private val values: Map<String, String>) {

    operator fun get(key: String): String = values[key] ?: DEFAULTS[key] ?: key

    val name get() = this["name"]
    val ask get() = this["ask"]
    val whatWeChecked get() = this["whatWeChecked"]
    val previewClose get() = this["previewClose"]
    val askA11y get() = this["askA11y"]
    val talkA11y get() = this["talkA11y"]
    val listening get() = this["listening"]
    val muted get() = this["muted"]
    val paused get() = this["paused"]
    val thinking get() = this["thinking"]
    val speaking get() = this["speaking"]
    val checking get() = this["checking"]
    val warning get() = this["warning"]
    val rechecking get() = this["rechecking"]
    val connecting get() = this["connecting"]
    val end get() = this["end"]
    val endA11y get() = this["endA11y"]
    val captionHint get() = this["captionHint"]
    val voiceChip get() = this["voiceChip"]
    val micDenied get() = this["micDenied"]
    val needsForeground get() = this["needsForeground"]
    val endedCap get() = this["endedCap"]
    val muteA11y get() = this["muteA11y"]
    val unmuteA11y get() = this["unmuteA11y"]

    /** Message for a live error code from the server or the session. */
    fun error(code: String?): String = when (code) {
        "rate_limited" -> this["rateLimited"]
        "busy" -> this["busy"]
        "not_found" -> this["notFound"]
        "mic_denied" -> micDenied
        "needs_foreground" -> needsForeground
        else -> this["unavailable"]
    }

    companion object {
        const val MAX_LENGTH = 160

        val DEFAULTS: Map<String, String> = linkedMapOf(
            "name" to "Pyit Taing Htaung",
            "ask" to "Ask",
            "whatWeChecked" to "This is what we checked",
            "previewClose" to "Tap to close. This picture is not saved.",
            "askA11y" to "Ask Pyit Taing Htaung about this result",
            "talkA11y" to "Talk to Pyit Taing Htaung",
            "listening" to "Listening",
            "muted" to "Muted",
            "paused" to "Paused",
            "thinking" to "Thinking",
            "speaking" to "Speaking",
            "checking" to "Checking",
            "warning" to "Warning",
            "rechecking" to "Checking again",
            "connecting" to "Connecting",
            "end" to "End",
            "endA11y" to "End the conversation",
            "captionHint" to "Ask Pyit Taing Htaung about your screen",
            "voiceChip" to "Pyit Taing Htaung",
            "micDenied" to "Open SafeRoute to allow the microphone",
            "needsForeground" to "Open SafeRoute once to allow voice",
            "unavailable" to "Voice is not available right now",
            "rateLimited" to "You have used many checks this hour",
            "busy" to "Another voice conversation is open",
            "notFound" to "Check the screen again to talk",
            "endedCap" to "Time is up. Double tap the shield to talk again",
            "muteA11y" to "Double tap to mute the microphone",
            "unmuteA11y" to "Double tap to turn the microphone on",
        )

        val DEFAULT = ShieldStrings(emptyMap())

        /** Keeps known keys with a non-blank text, trimmed and capped. Anything else falls back to English. */
        fun from(raw: Map<String, Any?>?): ShieldStrings {
            if (raw.isNullOrEmpty()) return DEFAULT
            val clean = HashMap<String, String>()
            for ((key, value) in raw) {
                if (key !in DEFAULTS) continue
                val text = (value as? String)?.replace(Regex("\\s+"), " ")?.trim().orEmpty()
                if (text.isNotEmpty()) clean[key] = text.take(MAX_LENGTH)
            }
            return ShieldStrings(clean)
        }
    }
}
