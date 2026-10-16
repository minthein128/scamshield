package com.saferoute.shield

import android.content.Context
import android.content.res.Configuration

/**
 * Colors for the overlay, matching src/theme/theme.ts and docs/brand.md: lacquer black for interactive
 * elements, warm neutrals, red and gold only in the doll and its halo, blue only for Low risk, deep
 * crimson for High risk. The dark set is derived from the same palette.
 */
internal class ShieldPalette(val dark: Boolean) {
    val surface = if (dark) 0xFF2E2723.toInt() else 0xFFFFFFFF.toInt()
    val border = if (dark) 0xFF4A403A.toInt() else 0xFFE6DED3.toInt()
    val textPrimary = if (dark) 0xFFEFE8DF.toInt() else 0xFF1F1A17.toInt()
    val textSecondary = if (dark) 0xFFDDD3C7.toInt() else 0xFF57504A.toInt()
    val textMuted = if (dark) 0xFFA89E94.toInt() else 0xFF6B635C.toInt()
    /** Lacquer black in light mode (buttons, links); the cream page colour on dark. */
    val accent = if (dark) 0xFFF7F3EE.toInt() else 0xFF1F1A17.toInt()
    val shadow = if (dark) 0x99000000.toInt() else 0x401F1A17
    val targetFill = if (dark) 0xE64A403A.toInt() else 0xE61F1A17.toInt()
    /** The doll's colours, for the voice halo and the listening badge only. */
    val brandRed = 0xFFB8321C.toInt()
    val brandGold = 0xFFF2B01E.toInt()
    /** Ask chip: the app's primary button (lacquer black, white text and mic); inverted on dark. */
    val askFill = if (dark) 0xFFF7F3EE.toInt() else 0xFF1F1A17.toInt()
    val askPressed = if (dark) 0xFFDDD3C7.toInt() else 0xFF3D3631.toInt()
    val askText = if (dark) 0xFF1F1A17.toInt() else 0xFFFFFFFF.toInt()

    fun ring(state: ShieldOverlay.State): Int = when (state) {
        ShieldOverlay.State.IDLE -> if (dark) 0xFF6B635C.toInt() else 0xFFD7CDC0.toInt()
        ShieldOverlay.State.CHECKING -> accent
        ShieldOverlay.State.SAFE -> if (dark) 0xFF8FB0FF.toInt() else 0xFF1D4ED8.toInt()
        ShieldOverlay.State.CAREFUL -> if (dark) 0xFFFBBF24.toInt() else 0xFFB45309.toInt()
        ShieldOverlay.State.DANGER -> if (dark) 0xFFE11D48.toInt() else 0xFF9F1239.toInt()
        ShieldOverlay.State.ERROR -> if (dark) 0xFFA89E94.toInt() else 0xFF6B635C.toInt()
    }

    fun glyph(state: ShieldOverlay.State): Int =
        if (state == ShieldOverlay.State.IDLE || state == ShieldOverlay.State.CHECKING) accent else ring(state)

    fun chipBackground(state: ShieldOverlay.State): Int = when (state) {
        ShieldOverlay.State.SAFE -> if (dark) 0xFF1E3A8A.toInt() else 0xFFDBE5FF.toInt()
        ShieldOverlay.State.CAREFUL -> if (dark) 0xFF78350F.toInt() else 0xFFFEF3C7.toInt()
        ShieldOverlay.State.DANGER -> 0xFF9F1239.toInt()
        else -> if (dark) 0xFF4A403A.toInt() else 0xFFF1EBE3.toInt()
    }

    fun chipText(state: ShieldOverlay.State): Int = when (state) {
        ShieldOverlay.State.SAFE -> if (dark) 0xFFDBE5FF.toInt() else 0xFF1E3A8A.toInt()
        ShieldOverlay.State.CAREFUL -> if (dark) 0xFFFDE68A.toInt() else 0xFF854D0E.toInt()
        ShieldOverlay.State.DANGER -> 0xFFFFFFFF.toInt()
        else -> if (dark) 0xFFEFE8DF.toInt() else 0xFF3D3631.toInt()
    }

    fun severity(severity: String): Int = when (severity) {
        "high" -> ring(ShieldOverlay.State.DANGER)
        "medium" -> ring(ShieldOverlay.State.CAREFUL)
        else -> textMuted
    }

    companion object {
        fun forContext(context: Context): ShieldPalette {
            val night = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
            return ShieldPalette(night == Configuration.UI_MODE_NIGHT_YES)
        }

        /** Kind of failure behind an error message from CheckClient or the service: offline, rate, busy or other. */
        /** Kind of failure behind an English error message from CheckClient or the service. */
        fun errorKind(message: String): String {
            val m = message.lowercase()
            return when {
                "no connection" in m || "internet" in m -> "offline"
                "too many" in m -> "rate"
                "busy" in m -> "busy"
                "too large" in m -> "large"
                "not allowed" in m || "permission" in m -> "denied"
                "screen capture" in m || "read the screen" in m -> "capture"
                else -> "other"
            }
        }
    }
}
