package com.saferoute.shield

import android.content.Context
import android.graphics.Typeface

/** Plus Jakarta Sans from the app assets (bundled by the expo-font plugin). Falls back to system sans. */
internal class ShieldFonts(context: Context) {
    val regular: Typeface = load(context, "PlusJakartaSans-Regular", Typeface.create("sans-serif", Typeface.NORMAL))
    val semiBold: Typeface = load(context, "PlusJakartaSans-SemiBold", Typeface.create("sans-serif-medium", Typeface.NORMAL))
    val bold: Typeface = load(context, "PlusJakartaSans-Bold", Typeface.create("sans-serif", Typeface.BOLD))

    private fun load(context: Context, name: String, fallback: Typeface): Typeface = try {
        Typeface.createFromAsset(context.assets, "fonts/$name.ttf")
    } catch (_: Exception) {
        fallback
    }
}
