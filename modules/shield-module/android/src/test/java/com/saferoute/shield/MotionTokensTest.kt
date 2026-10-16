package com.saferoute.shield

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

/** The overlay moves like the app: ShieldMotion must match src/theme/motion.ts. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class MotionTokensTest {

    private val source: String by lazy {
        generateSequence(File("").absoluteFile) { it.parentFile }
            .map { File(it, "src/theme/motion.ts") }
            .first { it.exists() }
            .readText()
    }

    private fun numbers(key: String): FloatArray {
        val list = Regex("""\b$key: \[([^\]]+)\]""").find(source)?.groupValues?.get(1) ?: error("no $key in motion.ts")
        return list.split(',').map { it.trim().toFloat() }.toFloatArray()
    }

    private fun number(key: String): Long =
        Regex("""\b$key: (\d+)""").find(source)?.groupValues?.get(1)?.toLong() ?: error("no $key in motion.ts")

    @Test
    fun curvesMatchTheApp() {
        assertArrayEquals(numbers("out"), ShieldMotion.CURVE_OUT, 0f)
        assertArrayEquals(numbers("inOut"), ShieldMotion.CURVE_IN_OUT, 0f)
        assertArrayEquals(numbers("exit"), ShieldMotion.CURVE_EXIT, 0f)
        assertArrayEquals(numbers("pop"), ShieldMotion.CURVE_POP, 0f)
    }

    @Test
    fun durationsAndSwayMatchTheApp() {
        assertEquals(number("exit"), ShieldMotion.EXIT_MS)
        assertEquals(number("fade"), ShieldMotion.FADE_MS)
        assertEquals(number("step"), ShieldMotion.STEP_MS)
        assertEquals(number("reveal"), ShieldMotion.REVEAL_MS)
        assertEquals(number("sway"), ShieldMotion.SWAY_MS)
        assertEquals(number("restMs"), ShieldMotion.SWAY_REST_MS)
        assertArrayEquals(numbers("swings"), ShieldMotion.SWINGS, 0f)
    }

    @Test
    fun swayIsDampedAndRestsUpright() {
        val peaks = (0 until ShieldMotion.SWAY_MS.toInt() step 8).map { kotlin.math.abs(ShieldMotion.swayAngle(it.toLong())) }
        assertTrue("sway stays subtle", peaks.max() <= 5f)
        assertEquals(0f, ShieldMotion.swayAngle(0), 0.01f)
        assertEquals(0f, ShieldMotion.swayAngle(ShieldMotion.SWAY_MS - 10), 0.01f)
        assertEquals(ShieldMotion.swayAngle(100), ShieldMotion.swayAngle(ShieldMotion.SWAY_MS + 100), 0.001f)
    }

    @Test
    fun checkingRingNeverClaimsToBeDone() {
        assertEquals(0f, ShieldMotion.creep(0), 0f)
        assertTrue(ShieldMotion.creep(3000) < ShieldMotion.creep(6000))
        assertTrue(ShieldMotion.creep(600_000) < 0.95f)
    }
}
