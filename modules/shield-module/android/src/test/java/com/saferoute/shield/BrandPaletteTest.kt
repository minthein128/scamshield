package com.saferoute.shield

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

/** The light overlay palette must equal the app theme (src/theme/theme.ts). */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class BrandPaletteTest {

    private val theme: Map<String, Int> by lazy {
        val file = generateSequence(File("").absoluteFile) { it.parentFile }
            .map { File(it, "src/theme/theme.ts") }
            .first { it.exists() }
        Regex("""(\w+): '#([0-9A-Fa-f]{6})'""").findAll(file.readText())
            .associate { it.groupValues[1] to (0xFF000000.toInt() or it.groupValues[2].toInt(16)) }
    }

    private val light = ShieldPalette(false)

    @Test
    fun lightPaletteMatchesTheAppTheme() {
        assertEquals(theme["cardBackground"], light.surface)
        assertEquals(theme["border"], light.border)
        assertEquals(theme["textPrimary"], light.textPrimary)
        assertEquals(theme["textSecondary"], light.textSecondary)
        assertEquals(theme["textMuted"], light.textMuted)
        assertEquals(theme["accent"], light.accent)
        assertEquals(theme["accent"], light.askFill)
        assertEquals(theme["brandRed"], light.brandRed)
        assertEquals(theme["brandGold"], light.brandGold)
    }

    @Test
    fun verdictColoursMatchTheAppVerdictRoles() {
        assertEquals(theme["safe"], light.ring(ShieldOverlay.State.SAFE))
        assertEquals(theme["safeBg"], light.chipBackground(ShieldOverlay.State.SAFE))
        assertEquals(theme["safeText"], light.chipText(ShieldOverlay.State.SAFE))
        assertEquals(theme["warningText"], light.ring(ShieldOverlay.State.CAREFUL))
        assertEquals(theme["amberLight"], light.chipBackground(ShieldOverlay.State.CAREFUL))
        assertEquals(theme["amberDark"], light.chipText(ShieldOverlay.State.CAREFUL))
        assertEquals(theme["danger"], light.ring(ShieldOverlay.State.DANGER))
        assertEquals(theme["danger"], light.chipBackground(ShieldOverlay.State.DANGER))
    }

    @Test
    fun blueIsOnlyLowRiskAndRedIsNeverAVerdict() {
        for (dark in listOf(false, true)) {
            val p = ShieldPalette(dark)
            val blues = setOf(0xFF1D4ED8.toInt(), 0xFF8FB0FF.toInt(), 0xFFDBE5FF.toInt(), 0xFF1E3A8A.toInt())
            val nonSafe = listOf(p.surface, p.border, p.accent, p.askFill, p.askText, p.textPrimary, p.textMuted) +
                listOf(ShieldOverlay.State.IDLE, ShieldOverlay.State.CHECKING, ShieldOverlay.State.CAREFUL, ShieldOverlay.State.DANGER, ShieldOverlay.State.ERROR)
                    .flatMap { listOf(p.ring(it), p.chipBackground(it), p.chipText(it)) }
            assertTrue("dark=$dark", nonSafe.none { it in blues })
            val verdicts = ShieldOverlay.State.values().flatMap { listOf(p.ring(it), p.chipBackground(it)) }
            assertTrue("brand red is not a verdict", p.brandRed !in verdicts && p.brandGold !in verdicts)
        }
    }

    @Test
    fun textPairsPassWcagAa() {
        for (dark in listOf(false, true)) {
            val p = ShieldPalette(dark)
            for (s in ShieldOverlay.State.values()) assertTrue("$s dark=$dark", CaptureMask.contrast(p.chipText(s), p.chipBackground(s)) >= 4.5)
            assertTrue(CaptureMask.contrast(p.textMuted, p.surface) >= 4.5)
            assertTrue(CaptureMask.contrast(p.accent, p.surface) >= 4.5)
            assertTrue(CaptureMask.contrast(p.ring(ShieldOverlay.State.DANGER), p.surface) >= 3.0)
        }
    }
}
