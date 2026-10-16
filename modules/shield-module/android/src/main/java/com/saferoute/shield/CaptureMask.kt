package com.saferoute.shield

import android.graphics.Bitmap
import android.graphics.Rect
import kotlin.math.roundToInt
import kotlin.math.sqrt

/**
 * Removes SafeRoute's own overlay windows from a captured frame, so the bubble can stay on screen
 * during a check. Each window rect is filled with the average colour of a thin ring around it.
 * When the ring is busy (text, photos), filling would erase content, so the caller hides instead.
 */
internal object CaptureMask {
    /** Luminance standard deviation (0..255) above which the surroundings count as content. */
    const val MAX_SPREAD = 20.0
    const val MIN_SAMPLES = 24

    data class Surround(val color: Int, val spread: Double, val samples: Int) {
        val quiet: Boolean get() = samples >= MIN_SAMPLES && spread <= MAX_SPREAD
    }

    /** A window rect in real screen pixels, scaled into a bitmap of [bmpW] x [bmpH] and clipped. Null when off screen. */
    fun toBitmapRect(screen: Rect, scale: Float, bmpW: Int, bmpH: Int): Rect? {
        val r = Rect(
            (screen.left * scale).toInt(),
            (screen.top * scale).toInt(),
            (screen.right * scale + 0.999f).toInt(),
            (screen.bottom * scale + 0.999f).toInt(),
        )
        return if (r.intersect(0, 0, bmpW, bmpH) && !r.isEmpty) r else null
    }

    /** Ring width around a rect: a tenth of its short side, at least 3 px. */
    fun band(r: Rect): Int = maxOf(3, minOf(r.width(), r.height()) / 10)

    /** Average colour and luminance spread of the [band]-wide ring around [r] in a w x h pixel array. */
    fun surround(pixels: IntArray, w: Int, h: Int, r: Rect, band: Int, skip: List<Rect> = emptyList()): Surround {
        val outer = Rect(r.left - band, r.top - band, r.right + band, r.bottom + band)
        if (!outer.intersect(0, 0, w, h)) return Surround(0, 0.0, 0)
        var n = 0
        var sr = 0L
        var sg = 0L
        var sb = 0L
        var sl = 0.0
        var sl2 = 0.0
        for (y in outer.top until outer.bottom) {
            for (x in outer.left until outer.right) {
                if (r.contains(x, y) || skip.any { it.contains(x, y) }) continue
                val p = pixels[y * w + x]
                val cr = (p shr 16) and 0xFF
                val cg = (p shr 8) and 0xFF
                val cb = p and 0xFF
                val lum = 0.299 * cr + 0.587 * cg + 0.114 * cb
                sr += cr
                sg += cg
                sb += cb
                sl += lum
                sl2 += lum * lum
                n++
            }
        }
        if (n == 0) return Surround(0, 0.0, 0)
        val mean = sl / n
        val spread = sqrt(maxOf(0.0, sl2 / n - mean * mean))
        val color = (0xFF shl 24) or ((sr / n).toInt() shl 16) or ((sg / n).toInt() shl 8) or (sb / n).toInt()
        return Surround(color, spread, n)
    }

    /**
     * Fills every rect with its surround colour, in place. Returns false and changes nothing when any
     * surround is busy, so the caller can fall back to hiding the windows.
     */
    fun maskPixels(pixels: IntArray, w: Int, h: Int, rects: List<Rect>): Boolean {
        val fills = rects.map { r -> r to surround(pixels, w, h, r, band(r), rects.filter { it !== r }) }
        if (fills.any { !it.second.quiet }) return false
        for ((r, s) in fills) {
            for (y in r.top until r.bottom) java.util.Arrays.fill(pixels, y * w + r.left, y * w + r.right, s.color)
        }
        return true
    }

    /** Masks a bitmap region by region. Same contract as [maskPixels]. */
    fun maskBitmap(bitmap: Bitmap, screenRects: List<Rect>, scale: Float): Boolean {
        val w = bitmap.width
        val h = bitmap.height
        val rects = screenRects.mapNotNull { toBitmapRect(it, scale, w, h) }
        if (rects.isEmpty()) return true
        val regions = rects.map { r ->
            val b = band(r)
            val outer = Rect(r.left - b, r.top - b, r.right + b, r.bottom + b).apply { intersect(0, 0, w, h) }
            val px = IntArray(outer.width() * outer.height())
            bitmap.getPixels(px, 0, outer.width(), outer.left, outer.top, outer.width(), outer.height())
            val local = Rect(r).apply { offset(-outer.left, -outer.top) }
            Triple(outer, px, local)
        }
        val surrounds = regions.mapIndexed { i, (outer, px, local) ->
            val others = rects.filterIndexed { j, _ -> j != i }.map { Rect(it).apply { offset(-outer.left, -outer.top) } }
            surround(px, outer.width(), outer.height(), local, band(local), others)
        }
        if (surrounds.any { !it.quiet }) return false
        regions.forEachIndexed { i, (outer, px, local) ->
            val c = surrounds[i].color
            for (y in local.top until local.bottom) {
                java.util.Arrays.fill(px, y * outer.width() + local.left, y * outer.width() + local.right, c)
            }
            bitmap.setPixels(px, 0, outer.width(), outer.left, outer.top, outer.width(), outer.height())
        }
        return true
    }

    /** WCAG 2 contrast ratio of two opaque colours. */
    fun contrast(a: Int, b: Int): Double {
        fun lum(c: Int): Double {
            fun ch(v: Int): Double {
                val s = v / 255.0
                return if (s <= 0.03928) s / 12.92 else Math.pow((s + 0.055) / 1.055, 2.4)
            }
            return 0.2126 * ch((c shr 16) and 0xFF) + 0.7152 * ch((c shr 8) and 0xFF) + 0.0722 * ch(c and 0xFF)
        }
        val la = lum(a)
        val lb = lum(b)
        return ((maxOf(la, lb) + 0.05) / (minOf(la, lb) + 0.05) * 100).roundToInt() / 100.0
    }
}
