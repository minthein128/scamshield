package com.saferoute.shield

import android.content.Context
import android.content.res.Configuration

/** Colors for the overlay, taken from src/theme/theme.ts. The dark set is derived from the same palette. */
internal class ShieldPalette(val dark: Boolean) {
    val surface = if (dark) 0xFF1E293B.toInt() else 0xFFFFFFFF.toInt()
    val border = if (dark) 0xFF334155.toInt() else 0xFFDCE3EC.toInt()
    val textPrimary = if (dark) 0xFFE2E8F0.toInt() else 0xFF0F1B2D.toInt()
    val textSecondary = if (dark) 0xFFCBD5E1.toInt() else 0xFF475569.toInt()
    val textMuted = if (dark) 0xFF94A3B8.toInt() else 0xFF64748B.toInt()
    val accent = if (dark) 0xFF8FB0FF.toInt() else 0xFF1D4ED8.toInt()
    val shadow = if (dark) 0x99000000.toInt() else 0x40000000
    val targetFill = if (dark) 0xE6334155.toInt() else 0xE60F1B2D.toInt()
    /** Ask chip: solid brand blue, so it never reads as a verdict chip (red, amber) or as a black hole in dark mode. */
    val askFill = if (dark) 0xFF8FB0FF.toInt() else 0xFF1D4ED8.toInt()
    val askPressed = if (dark) 0xFFB9CDFF.toInt() else 0xFF1E3A8A.toInt()
    val askText = if (dark) 0xFF0F1B2D.toInt() else 0xFFFFFFFF.toInt()

    fun ring(state: ShieldOverlay.State): Int = when (state) {
        ShieldOverlay.State.IDLE -> if (dark) 0xFF475569.toInt() else 0xFFCBD5E1.toInt()
        ShieldOverlay.State.CHECKING -> accent
        ShieldOverlay.State.SAFE -> accent
        ShieldOverlay.State.CAREFUL -> if (dark) 0xFFFBBF24.toInt() else 0xFFB45309.toInt()
        ShieldOverlay.State.DANGER -> if (dark) 0xFFFB923C.toInt() else 0xFFC2410C.toInt()
        ShieldOverlay.State.ERROR -> if (dark) 0xFF94A3B8.toInt() else 0xFF64748B.toInt()
    }

    fun glyph(state: ShieldOverlay.State): Int =
        if (state == ShieldOverlay.State.IDLE || state == ShieldOverlay.State.CHECKING) accent else ring(state)

    fun chipBackground(state: ShieldOverlay.State): Int = when (state) {
        ShieldOverlay.State.SAFE -> if (dark) 0xFF1E3A8A.toInt() else 0xFFDBE5FF.toInt()
        ShieldOverlay.State.CAREFUL -> if (dark) 0xFF78350F.toInt() else 0xFFFEF3C7.toInt()
        ShieldOverlay.State.DANGER -> if (dark) 0xFF9A3412.toInt() else 0xFFC2410C.toInt()
        else -> if (dark) 0xFF334155.toInt() else 0xFFEEF2F6.toInt()
    }

    fun chipText(state: ShieldOverlay.State): Int = when (state) {
        ShieldOverlay.State.SAFE -> if (dark) 0xFFDBE5FF.toInt() else 0xFF1E3A8A.toInt()
        ShieldOverlay.State.CAREFUL -> if (dark) 0xFFFDE68A.toInt() else 0xFF854D0E.toInt()
        ShieldOverlay.State.DANGER -> 0xFFFFFFFF.toInt()
        else -> if (dark) 0xFFE2E8F0.toInt() else 0xFF334155.toInt()
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

        fun chipLabel(state: ShieldOverlay.State): String = when (state) {
            ShieldOverlay.State.SAFE -> "Safe"
            ShieldOverlay.State.CAREFUL -> "Be careful"
            ShieldOverlay.State.DANGER -> "High risk"
            else -> "Not checked"
        }

        /** Short chip text for an error message from CheckClient or the service. */
        fun errorLabel(message: String): String {
            val m = message.lowercase()
            return when {
                "no connection" in m || "internet" in m -> "Offline"
                "too many" in m -> "Rate limited"
                "busy" in m -> "Service busy"
                else -> "Not checked"
            }
        }
    }
}
