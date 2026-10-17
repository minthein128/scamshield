package com.saferoute.shield

/** Voice companion labels. The app passes them in the user's language; English is the fallback. */
class ShieldStrings private constructor(private val values: Map<String, String>) {

    operator fun get(key: String): String = values[key] ?: DEFAULTS[key] ?: key

    val name get() = this["name"]
    val appName get() = this["appName"]
    val ask get() = this["ask"]
    val tapToRetry get() = this["tapToRetry"]
    val dismiss get() = this["dismiss"]
    val fullReport get() = this["fullReport"]
    val showDetails get() = this["showDetails"]
    val closeShield get() = this["closeShield"]

    /** Verdict chip, the same words as the app (common:verdict): Low risk, Be careful, High risk. */
    fun chip(state: ShieldOverlay.State): String = when (state) {
        ShieldOverlay.State.SAFE -> this["verdictSafe"]
        ShieldOverlay.State.CAREFUL -> this["verdictCareful"]
        ShieldOverlay.State.DANGER -> this["verdictDanger"]
        else -> this["chipNotChecked"]
    }

    /** The sentence TalkBack reads for a failed check, in the user's language. Unknown failures read as "The check failed". */
    fun errorText(message: String?): String = when (ShieldPalette.errorKind(message.orEmpty())) {
        "offline" -> this["errNoConnection"]
        "rate" -> this["errTooMany"]
        "busy" -> this["errBusy"]
        "large" -> this["errTooLarge"]
        "denied" -> this["errCaptureDenied"]
        "capture" -> this["errCapture"]
        else -> this["errFailed"]
    }

    /** Short chip for a failed check. */
    fun errorChip(message: String): String = when (ShieldPalette.errorKind(message)) {
        "offline" -> this["chipOffline"]
        "rate" -> this["chipRateLimited"]
        "busy" -> this["chipBusy"]
        else -> this["chipNotChecked"]
    }

    /** Severity word for a flag, read by TalkBack; reuses the verdict words. */
    fun severity(severity: String): String = when (severity) {
        "high" -> this["verdictDanger"]
        "medium" -> this["verdictCareful"]
        else -> this["verdictSafe"]
    }
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
    val endA11y get() = this["endA11y"]
    val voiceChip get() = this["voiceChip"]
    val micDenied get() = this["micDenied"]
    val needsForeground get() = this["needsForeground"]
    val endedCap get() = this["endedCap"]
    val captureCancelled get() = this["captureCancelled"]
    val sharingNotice get() = this["sharingNotice"]
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
            "name" to "Kakwe",
            "ask" to "Ask",
            "verdictSafe" to "Low risk",
            "verdictCareful" to "Be careful",
            "verdictDanger" to "High risk",
            "chipOffline" to "Offline",
            "chipRateLimited" to "Too many checks",
            "chipBusy" to "Service busy",
            "chipNotChecked" to "Not checked",
            "tapToRetry" to "Tap to retry",
            "appName" to "Kakwe",
            "a11yShield" to "Kakwe shield",
            "a11yCheckScreen" to "Double tap to check the screen.",
            "a11yChecking" to "Checking the screen.",
            "a11yShowDetails" to "Double tap to show details.",
            "a11yExpanded" to "Expanded.",
            "errNoConnection" to "No connection. Check your internet and try again.",
            "errTooMany" to "Too many checks. Wait a minute and try again.",
            "errBusy" to "The check service is busy. Try again soon.",
            "errTooLarge" to "The screenshot is too large to check.",
            "errCapture" to "Could not read the screen. Tap the shield to try again.",
            "errCaptureDenied" to "Screen capture was not allowed. Tap the shield to try again.",
            "errFailed" to "The check failed. Try again.",
            "captureCancelled" to "Nothing was shared. Tap the doll when you want a check.",
            "sharingNotice" to "Kakwe can check your screen while the shield is on. Turn off the shield to stop.",
            "dismiss" to "Dismiss",
            "fullReport" to "Full report",
            "showDetails" to "Show details",
            "closeShield" to "Close shield",
            "whatWeChecked" to "This is what we checked",
            "previewClose" to "Tap to close. This picture is not saved.",
            "askA11y" to "Ask Kakwe about this result",
            "talkA11y" to "Talk to Kakwe",
            "listening" to "Listening",
            "muted" to "Muted",
            "paused" to "Paused",
            "thinking" to "Thinking",
            "speaking" to "Speaking",
            "checking" to "Checking",
            "warning" to "Warning",
            "rechecking" to "Checking again",
            "connecting" to "Connecting",
            "endA11y" to "End the conversation",
            "voiceChip" to "Kakwe",
            "micDenied" to "Open Kakwe to allow the microphone",
            "needsForeground" to "Open Kakwe once to allow voice",
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
