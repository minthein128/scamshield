package com.saferoute.shield

import android.content.Context
import android.provider.Settings
import android.view.animation.PathInterpolator
import kotlin.math.exp

/** The overlay's motion tokens. They mirror src/theme/motion.ts; MotionTokensTest compares the two. */
internal object ShieldMotion {
    val CURVE_OUT = floatArrayOf(0.16f, 1f, 0.3f, 1f)
    val CURVE_IN_OUT = floatArrayOf(0.37f, 0f, 0.63f, 1f)
    val CURVE_EXIT = floatArrayOf(0.3f, 0f, 1f, 1f)
    val CURVE_POP = floatArrayOf(0.34f, 1.3f, 0.64f, 1f)

    val OUT = interpolator(CURVE_OUT)
    val IN_OUT = interpolator(CURVE_IN_OUT)
    val EXIT = interpolator(CURVE_EXIT)
    val POP = interpolator(CURVE_POP)

    const val EXIT_MS = 150L
    const val FADE_MS = 240L
    const val STEP_MS = 320L
    const val REVEAL_MS = 400L
    const val SWAY_MS = 2800L
    const val SWAY_REST_MS = 240L
    val SWINGS = floatArrayOf(4.5f, -3.2f, 2f, -1f, 0f)

    /** Time constant of the checking ring. It approaches [CREEP_MAX] and completes only when the result lands. */
    private const val CREEP_TAU_MS = 3000f
    private const val CREEP_MAX = 0.9f

    private fun interpolator(c: FloatArray) = PathInterpolator(c[0], c[1], c[2], c[3])

    /** The doll's tilt in degrees [ms] into the damped tumbler cycle: a soft nudge, shrinking swings, a rest. */
    fun swayAngle(ms: Long): Float {
        val pos = ms.mod(SWAY_MS)
        val leg = (SWAY_MS - SWAY_REST_MS) / SWINGS.size
        val i = (pos / leg).toInt()
        if (i >= SWINGS.size) return 0f
        val from = if (i == 0) 0f else SWINGS[i - 1]
        val f = (pos - i * leg).toFloat() / leg
        val eased = (if (i == 0) OUT else IN_OUT).getInterpolation(f)
        return from + (SWINGS[i] - from) * eased
    }

    /** Share of the ring shown [ms] after a check started. */
    fun creep(ms: Long): Float = CREEP_MAX * (1f - exp(-ms / CREEP_TAU_MS))

    /** False when the user turned animations off (Settings > Accessibility > Remove animations). */
    fun enabled(context: Context): Boolean =
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f
}
