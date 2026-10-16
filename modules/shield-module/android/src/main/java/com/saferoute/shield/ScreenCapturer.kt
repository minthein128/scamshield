package com.saferoute.shield

import android.content.Context
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.graphics.Rect
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import android.util.DisplayMetrics
import android.view.WindowManager
import java.io.ByteArrayOutputStream
import kotlin.math.roundToInt

/** Holds one MediaProjection and one VirtualDisplay for the whole session (Android 14 allows one). */
class ScreenCapturer(
    private val context: Context,
    private val projection: MediaProjection,
    private val onStopped: () -> Unit
) {
    private val lock = Object()
    private val thread = HandlerThread("shield-capture").apply { start() }
    private val handler = Handler(thread.looper)
    private val callback = object : MediaProjection.Callback() {
        override fun onStop() {
            release(stopProjection = false)
            onStopped()
        }
    }

    private var reader: ImageReader? = null
    private var display: VirtualDisplay? = null
    private var latest: Image? = null
    private var latestAt = 0L
    private var width = 0
    private var height = 0
    private var realWidth = 0
    private var released = false

    init {
        projection.registerCallback(callback, handler)
        val (w, h, dpi) = targetSize()
        width = w
        height = h
        val newReader = newReader(w, h)
        reader = newReader
        display = projection.createVirtualDisplay(
            "saferoute-shield",
            w,
            h,
            dpi,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            newReader.surface,
            null,
            handler
        )
    }

    private fun targetSize(): Triple<Int, Int, Int> {
        val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val realW: Int
        val realH: Int
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val bounds = wm.currentWindowMetrics.bounds
            realW = bounds.width()
            realH = bounds.height()
        } else {
            val metrics = DisplayMetrics()
            @Suppress("DEPRECATION")
            wm.defaultDisplay.getRealMetrics(metrics)
            realW = metrics.widthPixels
            realH = metrics.heightPixels
        }
        val dpi = context.resources.displayMetrics.densityDpi
        realWidth = realW
        if (realW <= MAX_WIDTH) return Triple(realW, realH, dpi)
        val scale = MAX_WIDTH.toFloat() / realW
        val scaledDpi = (dpi * scale).roundToInt().coerceAtLeast(72)
        return Triple(MAX_WIDTH, (realH * scale).roundToInt(), scaledDpi)
    }

    private fun newReader(w: Int, h: Int): ImageReader {
        val r = ImageReader.newInstance(w, h, PixelFormat.RGBA_8888, 3)
        r.setOnImageAvailableListener({ source ->
            val image = try {
                source.acquireLatestImage()
            } catch (e: Exception) {
                null
            }
            if (image != null) {
                synchronized(lock) {
                    if (released) {
                        image.close()
                    } else {
                        latest?.close()
                        latest = image
                        latestAt = SystemClock.elapsedRealtime()
                        lock.notifyAll()
                    }
                }
            }
        }, handler)
        return r
    }

    private fun resizeIfNeeded() {
        val (w, h, dpi) = targetSize()
        if (w == width && h == height) return
        val oldReader = reader
        val newReader = newReader(w, h)
        display?.resize(w, h, dpi)
        display?.surface = newReader.surface
        synchronized(lock) {
            latest?.close()
            latest = null
            latestAt = 0L
        }
        oldReader?.close()
        reader = newReader
        width = w
        height = h
    }

    /** Outcome of one capture. [Busy] means the masks would erase content; nothing was encoded. */
    sealed class Capture {
        class Jpeg(val bytes: ByteArray, val frameWaitMs: Long, val encodeMs: Long) : Capture()
        object Busy : Capture()
        object None : Capture()
    }

    /** Blocks. Returns a JPEG of a frame that arrived at or after notBefore (elapsedRealtime), else the newest. */
    fun captureJpeg(notBefore: Long, waitMs: Long): ByteArray? =
        (capture(notBefore, waitMs, emptyList()) as? Capture.Jpeg)?.bytes

    /**
     * Blocks like [captureJpeg] and paints over [masks] (real screen pixels) before encoding.
     * Returns [Capture.Busy] when the area around a mask is not plain enough to fill.
     */
    fun capture(notBefore: Long, waitMs: Long, masks: List<Rect>, onFrame: () -> Unit = {}): Capture {
        synchronized(lock) {
            if (released) return Capture.None
            resizeIfNeeded()
            val start = SystemClock.elapsedRealtime()
            val deadline = start + waitMs
            while (!released && latestAt < notBefore) {
                val remaining = deadline - SystemClock.elapsedRealtime()
                if (remaining <= 0) break
                lock.wait(remaining)
            }
            val image = latest ?: return Capture.None
            val waited = SystemClock.elapsedRealtime() - start
            onFrame()
            val bytes = encode(image, masks) ?: return Capture.Busy
            return Capture.Jpeg(bytes, waited, SystemClock.elapsedRealtime() - start - waited)
        }
    }

    private fun encode(image: Image, masks: List<Rect> = emptyList()): ByteArray? {
        val plane = image.planes[0]
        val pixelStride = plane.pixelStride
        val rowPadding = plane.rowStride - pixelStride * image.width
        val padded = Bitmap.createBitmap(
            image.width + rowPadding / pixelStride,
            image.height,
            Bitmap.Config.ARGB_8888
        )
        plane.buffer.rewind()
        padded.copyPixelsFromBuffer(plane.buffer)
        val cropped = if (rowPadding == 0) padded else Bitmap.createBitmap(padded, 0, 0, image.width, image.height)
        val bitmap = if (masks.isEmpty() || cropped.isMutable) cropped else cropped.copy(Bitmap.Config.ARGB_8888, true).also {
            if (cropped !== padded) cropped.recycle()
        }
        if (masks.isNotEmpty()) {
            val scale = if (realWidth > 0) image.width.toFloat() / realWidth else 1f
            if (!CaptureMask.maskBitmap(bitmap, masks, scale)) {
                if (bitmap !== padded) bitmap.recycle()
                padded.recycle()
                return null
            }
        }
        var bytes = ByteArray(0)
        for (quality in QUALITIES) {
            val out = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, out)
            bytes = out.toByteArray()
            if (bytes.size <= MAX_BYTES) break
        }
        if (bitmap !== padded) bitmap.recycle()
        padded.recycle()
        return bytes
    }

    fun release(stopProjection: Boolean = true) {
        synchronized(lock) {
            if (released) return
            released = true
            latest?.close()
            latest = null
            lock.notifyAll()
        }
        try {
            projection.unregisterCallback(callback)
        } catch (_: Exception) {
        }
        display?.release()
        display = null
        reader?.close()
        reader = null
        if (stopProjection) {
            try {
                projection.stop()
            } catch (_: Exception) {
            }
        }
        thread.quitSafely()
    }

    companion object {
        private const val MAX_WIDTH = 1080
        private const val MAX_BYTES = 3_000_000
        private val QUALITIES = intArrayOf(70, 50, 35)
    }
}
