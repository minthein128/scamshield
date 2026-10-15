package com.saferoute.shield

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.provider.Settings
import android.view.animation.OvershootInterpolator
import android.view.View
import android.view.animation.LinearInterpolator

/** The round shield. The ring color and the glyph show the state. Size is 56dp inside a 12dp shadow margin. */
internal class BubbleView(context: Context, palette: ShieldPalette) : View(context) {

    var palette: ShieldPalette = palette
        set(value) {
            field = value
            invalidate()
        }

    /** Voice companion glyph. NONE draws the plain shield. */
    var voice: Voice = Voice.NONE
        set(value) {
            if (field == value) return
            field = value
            if (value == Voice.THINKING) startThink() else stopThink()
            invalidate()
        }

    /** Companion avatar (the Pyit Taing Htaung doll) drawn while listening, thinking or speaking. Null keeps the glyphs. */
    var avatar: android.graphics.Bitmap? = null
        set(value) {
            field = value
            invalidate()
        }

    /** 0..1 input level while listening, output level while speaking. */
    var level: Float = 0f
        set(value) {
            val v = value.coerceIn(0f, 1f)
            if (kotlin.math.abs(v - field) < 0.01f) return
            field = v
            if (voice == Voice.LISTENING || voice == Voice.SPEAKING) invalidate()
        }

    var shieldState: ShieldOverlay.State = ShieldOverlay.State.IDLE
        set(value) {
            val before = field
            field = value
            if (value == ShieldOverlay.State.CHECKING) startScan() else stopScan()
            if (before == ShieldOverlay.State.CHECKING && value in VERDICTS) pop() else popScale = 1f
            invalidate()
        }

    private val d = resources.displayMetrics.density
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
    private val ring = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 3f * d
        strokeCap = Paint.Cap.ROUND
    }
    private val glyph = Paint(Paint.ANTI_ALIAS_FLAG)
    private val mark = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    private val arcBounds = RectF()
    private val matrix = Matrix()
    private val shieldPath = Path()
    private val markPath = Path()
    private val dotPath = Path()
    private var phase = 0f
    private var scanner: ValueAnimator? = null
    private var popScale = 1f
    private var markAlpha = 1f
    private val scanPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val levelRing = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val avatarPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    private val micPath = Path()
    private var thinker: ValueAnimator? = null
    private var thinkPhase = 0f
    private val clip = Path()

    init {
        setLayerType(LAYER_TYPE_SOFTWARE, null)
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val size = ((CIRCLE_DP + 2 * PAD_DP) * d).toInt()
        setMeasuredDimension(size, size)
    }

    override fun onDraw(canvas: Canvas) {
        val cx = width / 2f
        val cy = height / 2f
        val radius = CIRCLE_DP * d / 2f
        val accent = palette.ring(shieldState)

        fill.color = palette.surface
        fill.setShadowLayer(8f * d, 0f, 3f * d, palette.shadow)
        canvas.drawCircle(cx, cy, radius, fill)

        val inset = ring.strokeWidth / 2f + 1.5f * d
        arcBounds.set(cx - radius + inset, cy - radius + inset, cx + radius - inset, cy + radius - inset)
        ring.color = if (shieldState == ShieldOverlay.State.CHECKING) (palette.accent and 0x00FFFFFF) or 0x33000000 else accent
        canvas.drawArc(arcBounds, 0f, 360f, false, ring)

        if (voice != Voice.NONE) {
            drawVoice(canvas, cx, cy, radius, accent)
            return
        }

        val checking = shieldState == ShieldOverlay.State.CHECKING
        val pulse = if (checking && scanner != null) 1f + 0.05f * Math.sin(phase * 2 * Math.PI).toFloat() else 1f
        val box = 26f * d
        canvas.save()
        canvas.scale(popScale * pulse, popScale * pulse, cx, cy)
        matrix.setScale(box, box)
        matrix.postTranslate(cx - box / 2f, cy - box / 2f)
        buildShield(shieldPath)
        shieldPath.transform(matrix)
        glyph.color = palette.glyph(shieldState)
        canvas.drawPath(shieldPath, glyph)
        if (checking && scanner != null) drawScanLine(canvas, cx, cy, box)

        val markColor = (palette.surface and 0x00FFFFFF) or ((markAlpha * 255).toInt() shl 24)
        mark.color = markColor
        mark.strokeWidth = 0.1f * box
        markPath.reset()
        dotPath.reset()
        when (shieldState) {
            ShieldOverlay.State.SAFE -> {
                markPath.moveTo(0.30f, 0.50f)
                markPath.lineTo(0.44f, 0.64f)
                markPath.lineTo(0.70f, 0.36f)
            }
            ShieldOverlay.State.DANGER -> {
                mark.strokeWidth = 0.075f * box
                markPath.moveTo(0.5f, 0.26f)
                markPath.lineTo(0.75f, 0.70f)
                markPath.lineTo(0.25f, 0.70f)
                markPath.close()
                markPath.moveTo(0.5f, 0.40f)
                markPath.lineTo(0.5f, 0.54f)
                dotPath.addCircle(0.5f, 0.61f, 0.035f, Path.Direction.CW)
            }
            ShieldOverlay.State.CAREFUL, ShieldOverlay.State.ERROR -> {
                markPath.moveTo(0.5f, 0.28f)
                markPath.lineTo(0.5f, 0.56f)
                dotPath.addCircle(0.5f, 0.70f, 0.055f, Path.Direction.CW)
            }
            else -> Unit
        }
        if (!markPath.isEmpty) {
            markPath.transform(matrix)
            canvas.drawPath(markPath, mark)
        }
        if (!dotPath.isEmpty) {
            dotPath.transform(matrix)
            glyph.color = markColor
            canvas.drawPath(dotPath, glyph)
        }
        canvas.restore()
    }

    private fun drawVoice(canvas: Canvas, cx: Float, cy: Float, radius: Float, accent: Int) {
        if ((voice == Voice.LISTENING || voice == Voice.SPEAKING) && level > 0.02f) {
            levelRing.color = (accent and 0x00FFFFFF) or ((0x30 + (0x70 * level).toInt()) shl 24)
            levelRing.strokeWidth = (2f + 3f * level) * d
            canvas.drawCircle(cx, cy, radius + (1.5f + 7f * level) * d, levelRing)
        }
        val box = 26f * d
        matrix.setScale(box, box)
        matrix.postTranslate(cx - box / 2f, cy - box / 2f)
        val face = avatar
        if (face != null && voice != Voice.MUTED) {
            drawDoll(canvas, face, cx, cy, radius, box)
            return
        }
        when (voice) {
            Voice.LISTENING, Voice.MUTED -> {
                val color = if (voice == Voice.MUTED) palette.textMuted else palette.accent
                micPath.reset()
                micPath.addRoundRect(RectF(0.36f, 0.06f, 0.64f, 0.58f), 0.14f, 0.14f, Path.Direction.CW)
                micPath.transform(matrix)
                glyph.color = color
                canvas.drawPath(micPath, glyph)
                mark.color = color
                mark.strokeWidth = 0.08f * box
                markPath.reset()
                markPath.addArc(RectF(0.22f, 0.20f, 0.78f, 0.74f), 20f, 140f)
                markPath.moveTo(0.5f, 0.74f)
                markPath.lineTo(0.5f, 0.90f)
                markPath.moveTo(0.36f, 0.92f)
                markPath.lineTo(0.64f, 0.92f)
                if (voice == Voice.MUTED) {
                    markPath.moveTo(0.16f, 0.10f)
                    markPath.lineTo(0.84f, 0.90f)
                }
                markPath.transform(matrix)
                canvas.drawPath(markPath, mark)
            }
            Voice.THINKING, Voice.SPEAKING -> {
                val scale = if (voice == Voice.SPEAKING) 1f + 0.14f * level else 1f
                canvas.save()
                canvas.scale(scale, scale, cx, cy)
                buildShield(shieldPath)
                shieldPath.transform(matrix)
                glyph.color = palette.glyph(shieldState)
                canvas.drawPath(shieldPath, glyph)
                val dot = palette.surface and 0x00FFFFFF
                for (i in 0 until 3) {
                    val wave = if (voice == Voice.THINKING) {
                        val t = ((thinkPhase * 3f - i) % 3f + 3f) % 3f
                        if (t < 1f) 1f - kotlin.math.abs(t - 0.5f) * 2f else 0f
                    } else {
                        level
                    }
                    glyph.color = dot or ((0x80 + (0x7F * wave).toInt()) shl 24)
                    val bx = cx + (i - 1) * 0.2f * box
                    val by = cy - (if (voice == Voice.THINKING) 0.06f * box * wave else 0f)
                    canvas.drawCircle(bx, by, 0.065f * box, glyph)
                }
                canvas.restore()
            }
            Voice.NONE -> Unit
        }
    }

    /** The doll inside the ring: it rocks with the voice like a roly-poly, dots while thinking, a mic badge while listening. */
    private fun drawDoll(canvas: Canvas, face: android.graphics.Bitmap, cx: Float, cy: Float, radius: Float, box: Float) {
        val inner = radius - 4.5f * d
        canvas.save()
        clip.reset()
        clip.addCircle(cx, cy, inner, Path.Direction.CW)
        canvas.clipPath(clip)
        val speaking = voice == Voice.SPEAKING
        val scale = if (speaking) 1f + 0.06f * level else 1f
        val tilt = if (speaking) 7f * level * kotlin.math.sin(System.nanoTime() / 1.6e8).toFloat() else 0f
        canvas.rotate(tilt, cx, cy + inner)
        val half = inner * scale
        arcBounds.set(cx - half, cy - half, cx + half, cy + half)
        canvas.drawBitmap(face, null, arcBounds, avatarPaint)
        canvas.restore()
        if (voice == Voice.THINKING) {
            for (i in 0 until 3) {
                val t = ((thinkPhase * 3f - i) % 3f + 3f) % 3f
                val wave = if (t < 1f) 1f - kotlin.math.abs(t - 0.5f) * 2f else 0f
                glyph.color = (palette.accent and 0x00FFFFFF) or ((0x70 + (0x8F * wave).toInt()) shl 24)
                canvas.drawCircle(cx + (i - 1) * 0.22f * box, cy + inner - 5f * d - 2f * d * wave, 0.07f * box, glyph)
            }
        } else if (voice == Voice.LISTENING) {
            val bx = cx + inner * 0.72f
            val by = cy + inner * 0.72f
            val r = 7.5f * d
            glyph.color = palette.surface
            canvas.drawCircle(bx, by, r + 1.5f * d, glyph)
            glyph.color = palette.accent
            canvas.drawCircle(bx, by, r, glyph)
            val m = 9f * d
            matrix.setScale(m, m)
            matrix.postTranslate(bx - m / 2f, by - m / 2f)
            micPath.reset()
            micPath.addRoundRect(RectF(0.34f, 0.04f, 0.66f, 0.60f), 0.16f, 0.16f, Path.Direction.CW)
            micPath.transform(matrix)
            glyph.color = palette.surface
            canvas.drawPath(micPath, glyph)
            mark.color = palette.surface
            mark.strokeWidth = 0.12f * m
            markPath.reset()
            markPath.addArc(RectF(0.18f, 0.20f, 0.82f, 0.78f), 20f, 140f)
            markPath.moveTo(0.5f, 0.78f)
            markPath.lineTo(0.5f, 0.96f)
            markPath.transform(matrix)
            canvas.drawPath(markPath, mark)
        }
    }

    private fun startThink() {
        if (thinker != null || !animationsEnabled()) return
        thinker = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 1200
            repeatCount = ValueAnimator.INFINITE
            interpolator = LinearInterpolator()
            addUpdateListener {
                thinkPhase = it.animatedValue as Float
                invalidate()
            }
            start()
        }
    }

    private fun stopThink() {
        thinker?.cancel()
        thinker = null
    }

    private fun drawScanLine(canvas: Canvas, cx: Float, cy: Float, box: Float) {
        val top = cy - box / 2f
        val y = top + box * (0.08f + 0.84f * phase)
        canvas.save()
        clip.set(shieldPath)
        canvas.clipPath(clip)
        val band = 0.22f * box
        scanPaint.shader = LinearGradient(
            0f, y - band, 0f, y,
            palette.surface and 0x00FFFFFF, (palette.surface and 0x00FFFFFF) or 0x66000000,
            Shader.TileMode.CLAMP
        )
        canvas.drawRect(cx - box / 2f, y - band, cx + box / 2f, y, scanPaint)
        scanPaint.shader = null
        scanPaint.color = (palette.surface and 0x00FFFFFF) or 0xCC000000.toInt()
        scanPaint.strokeWidth = 1.5f * d
        canvas.drawLine(cx - box / 2f, y, cx + box / 2f, y, scanPaint)
        canvas.restore()
    }

    private fun pop() {
        if (!animationsEnabled()) {
            popScale = 1f
            markAlpha = 1f
            return
        }
        popScale = 0.8f
        markAlpha = 0f
        ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 340
            interpolator = OvershootInterpolator(2.4f)
            addUpdateListener {
                val t = it.animatedValue as Float
                popScale = 0.8f + 0.2f * t
                markAlpha = (t * 2f).coerceIn(0f, 1f)
                invalidate()
            }
            start()
        }
    }

    private fun animationsEnabled(): Boolean =
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f

    private fun buildShield(path: Path) {
        path.reset()
        path.moveTo(0.5f, 0.02f)
        path.lineTo(0.92f, 0.18f)
        path.lineTo(0.92f, 0.50f)
        path.quadTo(0.92f, 0.86f, 0.5f, 0.98f)
        path.quadTo(0.08f, 0.86f, 0.08f, 0.50f)
        path.lineTo(0.08f, 0.18f)
        path.close()
    }

    private fun startScan() {
        if (scanner != null || !animationsEnabled()) return
        scanner = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 1400
            repeatCount = ValueAnimator.INFINITE
            interpolator = LinearInterpolator()
            addUpdateListener {
                phase = it.animatedValue as Float
                invalidate()
            }
            start()
        }
    }

    private fun stopScan() {
        scanner?.cancel()
        scanner = null
    }

    override fun onDetachedFromWindow() {
        stopScan()
        stopThink()
        super.onDetachedFromWindow()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (shieldState == ShieldOverlay.State.CHECKING) startScan()
        if (voice == Voice.THINKING) startThink()
    }

    enum class Voice { NONE, LISTENING, MUTED, THINKING, SPEAKING }

    companion object {
        const val CIRCLE_DP = 56
        const val PAD_DP = 12
        private val VERDICTS = setOf(ShieldOverlay.State.SAFE, ShieldOverlay.State.CAREFUL, ShieldOverlay.State.DANGER)
    }
}

/** The close target that shows at the bottom while the bubble is dragged. */
internal class CloseTargetView(context: Context, private val palette: ShieldPalette) : View(context) {
    private val d = resources.displayMetrics.density
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
    private val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        color = 0xFFFFFFFF.toInt()
        strokeWidth = 2.5f * d
    }

    init {
        importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    override fun onDraw(canvas: Canvas) {
        val cx = width / 2f
        val cy = height / 2f
        fill.color = palette.targetFill
        canvas.drawCircle(cx, cy, 28f * d, fill)
        val a = 8f * d
        canvas.drawLine(cx - a, cy - a, cx + a, cy + a, stroke)
        canvas.drawLine(cx + a, cy - a, cx - a, cy + a, stroke)
    }
}
