package com.saferoute.shield

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

internal object ShieldHaptics {
    fun tick(context: Context) = play(context, longArrayOf(0, 12), intArrayOf(0, 90))

    fun safe(context: Context) = play(context, longArrayOf(0, 18), intArrayOf(0, 70))

    fun careful(context: Context) = play(context, longArrayOf(0, 35), intArrayOf(0, 160))

    fun danger(context: Context) =
        play(context, longArrayOf(0, 45, 70, 45, 70, 110), intArrayOf(0, 255, 0, 255, 0, 255))

    private fun play(context: Context, timings: LongArray, amplitudes: IntArray) {
        try {
            val vibrator = vibrator(context) ?: return
            if (!vibrator.hasVibrator()) return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val effect = if (vibrator.hasAmplitudeControl()) {
                    VibrationEffect.createWaveform(timings, amplitudes, -1)
                } else {
                    VibrationEffect.createWaveform(timings, -1)
                }
                vibrator.vibrate(effect)
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(timings, -1)
            }
        } catch (_: Exception) {
        }
    }

    private fun vibrator(context: Context): Vibrator? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
}
