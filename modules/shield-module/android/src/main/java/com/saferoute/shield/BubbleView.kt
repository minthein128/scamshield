package com.saferoute.shield

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.view.View
import android.view.animation.LinearInterpolator

/** The round shield. The ring color and the glyph show the state. Size is 56dp inside a 12dp shadow margin. */
internal class BubbleView(context: Context, palette: ShieldPalette) : View(context) {

    var palette: ShieldPalette = palette
        set(value) {
            field = value
            invalidate()
        }

    var shieldState: ShieldOverlay.State = ShieldOverlay.State.IDLE
        set(value) {
            field = value
            if (value == ShieldOverlay.State.CHECKING) startSpin() else stopSpin()
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
    private var spin = 0f
    private var spinner: ValueAnimator? = null

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
        if (shieldState == ShieldOverlay.State.CHECKING) {
            ring.color = (palette.accent and 0x00FFFFFF) or 0x33000000
            canvas.drawArc(arcBounds, 0f, 360f, false, ring)
            ring.color = palette.accent
            canvas.drawArc(arcBounds, spin, 110f, false, ring)
        } else {
            ring.color = accent
            canvas.drawArc(arcBounds, 0f, 360f, false, ring)
        }

        val box = 26f * d
        matrix.setScale(box, box)
        matrix.postTranslate(cx - box / 2f, cy - box / 2f)
        buildShield(shieldPath)
        shieldPath.transform(matrix)
        glyph.color = palette.glyph(shieldState)
        canvas.drawPath(shieldPath, glyph)

        mark.color = palette.surface
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
                markPath.moveTo(0.35f, 0.35f)
                markPath.lineTo(0.65f, 0.65f)
                markPath.moveTo(0.65f, 0.35f)
                markPath.lineTo(0.35f, 0.65f)
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
            glyph.color = palette.surface
            canvas.drawPath(dotPath, glyph)
        }
    }

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

    private fun startSpin() {
        if (spinner != null) return
        spinner = ValueAnimator.ofFloat(0f, 360f).apply {
            duration = 1100
            repeatCount = ValueAnimator.INFINITE
            interpolator = LinearInterpolator()
            addUpdateListener {
                spin = it.animatedValue as Float
                invalidate()
            }
            start()
        }
    }

    private fun stopSpin() {
        spinner?.cancel()
        spinner = null
    }

    override fun onDetachedFromWindow() {
        stopSpin()
        super.onDetachedFromWindow()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (shieldState == ShieldOverlay.State.CHECKING) startSpin()
    }

    companion object {
        const val CIRCLE_DP = 56
        const val PAD_DP = 12
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
