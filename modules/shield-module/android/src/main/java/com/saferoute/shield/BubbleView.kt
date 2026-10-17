package com.saferoute.shield

import android.animation.ArgbEvaluator
import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.os.SystemClock
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

    /** The Kakwe doll, drawn in every state. Null keeps the shield glyph. */
    var avatar: android.graphics.Bitmap? = null
        set(value) {
            field = value
            invalidate()
        }

    /** 0..1 input level while listening, output level while speaking. Set it on every tick; the halo eases toward it. */
    var level: Float = 0f
        set(value) {
            val v = value.coerceIn(0f, 1f)
            field = v
            val next = if (v == 0f && !voiceMoves()) 0f else shownLevel + (v - shownLevel) * (if (v > shownLevel) LEVEL_ATTACK else LEVEL_RELEASE)
            if (kotlin.math.abs(next - shownLevel) < 0.004f) return
            shownLevel = next
            if (voiceMoves()) invalidate()
        }
    private var shownLevel = 0f

    private fun voiceMoves() = voice == Voice.LISTENING || voice == Voice.SPEAKING

    var shieldState: ShieldOverlay.State = ShieldOverlay.State.IDLE
        set(value) {
            val before = field
            if (before == value) return
            val wasChecking = before == ShieldOverlay.State.CHECKING
            val leaving = if (wasChecking) checkingPose() else null
            field = value
            if (value == ShieldOverlay.State.CHECKING) startCheck() else stopCheck()
            if (wasChecking && value != ShieldOverlay.State.IDLE && leaving != null) reveal(leaving) else endReveal()
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
    private var checker: ValueAnimator? = null
    private var checkStart = 0L
    private var revealer: ValueAnimator? = null
    private var revealMs = REVEAL_TOTAL_MS.toFloat()
    private var fromProgress = 1f
    private var fromTilt = 0f
    private val argb = ArgbEvaluator()
    private val levelRing = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val avatarPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    private val badgePath = Path()
    private val badgeOutline = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeJoin = Paint.Join.ROUND
    }
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

        drawRing(canvas, cx, cy, radius, accent)

        if (voice != Voice.NONE) {
            drawVoice(canvas, cx, cy, radius, accent)
            return
        }

        avatar?.let {
            drawDollState(canvas, it, cx, cy, radius)
            return
        }

        val box = 26f * d
        val pop = 0.85f + 0.15f * badgeScale()
        canvas.save()
        canvas.scale(pop, pop, cx, cy)
        canvas.rotate(tilt(), cx, cy + box / 2f)
        matrix.setScale(box, box)
        matrix.postTranslate(cx - box / 2f, cy - box / 2f)
        buildShield(shieldPath)
        shieldPath.transform(matrix)
        glyph.color = palette.glyph(shieldState)
        canvas.drawPath(shieldPath, glyph)

        val markColor = (palette.surface and 0x00FFFFFF) or ((badgeAlpha() * 255).toInt() shl 24)
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

    private fun now() = SystemClock.uptimeMillis()

    private fun checking() = shieldState == ShieldOverlay.State.CHECKING

    /** Ring share and doll tilt while checking; null when motion is off. */
    private fun checkingPose(): Pair<Float, Float>? {
        if (checker == null) return null
        val ms = now() - checkStart
        return Pair(ShieldMotion.creep(ms), ShieldMotion.swayAngle(ms))
    }

    private fun revealT(delay: Long, length: Long): Float =
        ((revealMs - delay) / length).coerceIn(0f, 1f)

    private fun ringFill(): Float = ShieldMotion.OUT.getInterpolation(revealT(0, ShieldMotion.REVEAL_MS))

    private fun badgeScale(): Float = 0.6f + 0.4f * ShieldMotion.POP.getInterpolation(revealT(BADGE_DELAY_MS, ShieldMotion.STEP_MS))

    private fun badgeAlpha(): Float = revealT(BADGE_DELAY_MS, ShieldMotion.EXIT_MS)

    private fun tilt(): Float = when {
        checking() -> checkingPose()?.second ?: 0f
        revealer != null -> fromTilt * (1f - ShieldMotion.POP.getInterpolation(revealT(0, ShieldMotion.REVEAL_MS)))
        else -> 0f
    }

    /** Thin ring: a track and an arc that fills while checking, then fills in the verdict colour in one move. */
    private fun drawRing(canvas: Canvas, cx: Float, cy: Float, radius: Float, accent: Int) {
        val inset = ring.strokeWidth / 2f + 1.5f * d
        arcBounds.set(cx - radius + inset, cy - radius + inset, cx + radius - inset, cy + radius - inset)
        val track = (palette.accent and 0x00FFFFFF) or 0x24000000
        when {
            checking() -> {
                ring.color = track
                canvas.drawArc(arcBounds, 0f, 360f, false, ring)
                val share = checkingPose()?.first ?: return
                ring.color = palette.accent
                canvas.drawArc(arcBounds, -90f, 360f * share, false, ring)
            }
            revealer != null && voice == Voice.NONE -> {
                val t = ringFill()
                ring.color = track
                canvas.drawArc(arcBounds, 0f, 360f, false, ring)
                ring.color = argb.evaluate(t, palette.accent, accent) as Int
                canvas.drawArc(arcBounds, -90f, 360f * (fromProgress + (1f - fromProgress) * t), false, ring)
            }
            else -> {
                ring.color = accent
                canvas.drawArc(arcBounds, 0f, 360f, false, ring)
            }
        }
    }

    /** 0..1 height of thinking dot [i]: a slow travelling wave, so the three dots breathe in turn. */
    private fun dotWave(i: Int): Float =
        0.5f - 0.5f * kotlin.math.cos(2.0 * Math.PI * (thinkPhase - i / 3f)).toFloat()

    private fun drawVoice(canvas: Canvas, cx: Float, cy: Float, radius: Float, accent: Int) {
        val lvl = shownLevel
        if (voiceMoves() && lvl > 0.02f) {
            val halo = if (voice == Voice.LISTENING) palette.brandRed else palette.brandGold
            levelRing.color = (halo and 0x00FFFFFF) or (((0.25f + 0.45f * lvl) * 255).toInt() shl 24)
            levelRing.strokeWidth = 2.5f * d
            canvas.drawCircle(cx, cy, radius + (1.5f + 6f * lvl) * d, levelRing)
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
                val scale = if (voice == Voice.SPEAKING) 1f + 0.08f * shownLevel else 1f
                canvas.save()
                canvas.scale(scale, scale, cx, cy)
                buildShield(shieldPath)
                shieldPath.transform(matrix)
                glyph.color = palette.glyph(shieldState)
                canvas.drawPath(shieldPath, glyph)
                val dot = palette.surface and 0x00FFFFFF
                for (i in 0 until 3) {
                    val wave = if (voice == Voice.THINKING) dotWave(i) else shownLevel
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

    /** The doll clipped to the circle inside the ring, rocking about its round base like a roly-poly. */
    private fun drawDollFace(canvas: Canvas, face: android.graphics.Bitmap, cx: Float, cy: Float, inner: Float, scale: Float, tilt: Float) {
        canvas.save()
        clip.reset()
        clip.addCircle(cx, cy, inner, Path.Direction.CW)
        canvas.clipPath(clip)
        canvas.rotate(tilt, cx, cy + inner)
        val half = inner * scale
        arcBounds.set(cx - half, cy - half, cx + half, cy + half)
        canvas.drawBitmap(face, null, arcBounds, avatarPaint)
        canvas.restore()
    }

    /** Idle, checking and result states with the doll: a damped sway while checking, upright with a verdict badge after. */
    private fun drawDollState(canvas: Canvas, face: android.graphics.Bitmap, cx: Float, cy: Float, radius: Float) {
        val inner = radius - 4.5f * d
        drawDollFace(canvas, face, cx, cy, inner, 1f, tilt())
        drawVerdictBadge(canvas, cx + inner * 0.72f, cy + inner * 0.72f)
    }

    /** Verdict badge on the doll, shaped like the app's marks: check in a circle (safe), "!" in a triangle (careful), "!" in an octagon (danger), grey "!" circle (error). */
    private fun drawVerdictBadge(canvas: Canvas, bx: Float, by: Float) {
        val state = shieldState
        if (state == ShieldOverlay.State.IDLE || state == ShieldOverlay.State.CHECKING) return
        val alpha = badgeAlpha()
        if (alpha <= 0f) return
        val r = 9f * d * badgeScale()
        val m = 2f * r
        matrix.setScale(m, m)
        matrix.postTranslate(bx - r, by - r)
        badgePath.reset()
        when (state) {
            ShieldOverlay.State.CAREFUL -> {
                badgePath.moveTo(0.5f, 0.02f)
                badgePath.lineTo(1.0f, 0.92f)
                badgePath.lineTo(0.0f, 0.92f)
                badgePath.close()
            }
            ShieldOverlay.State.DANGER -> {
                val a = 0.29f
                badgePath.moveTo(a, 0f)
                badgePath.lineTo(1f - a, 0f)
                badgePath.lineTo(1f, a)
                badgePath.lineTo(1f, 1f - a)
                badgePath.lineTo(1f - a, 1f)
                badgePath.lineTo(a, 1f)
                badgePath.lineTo(0f, 1f - a)
                badgePath.lineTo(0f, a)
                badgePath.close()
            }
            else -> badgePath.addCircle(0.5f, 0.5f, 0.5f, Path.Direction.CW)
        }
        badgePath.transform(matrix)
        val a = (alpha * 255).toInt()
        badgeOutline.color = palette.surface
        badgeOutline.alpha = a
        badgeOutline.strokeWidth = 3f * d
        canvas.drawPath(badgePath, badgeOutline)
        glyph.color = palette.ring(state)
        glyph.alpha = a
        canvas.drawPath(badgePath, glyph)
        val white = 0x00FFFFFF or (a shl 24)
        mark.color = white
        mark.strokeWidth = 0.12f * m
        markPath.reset()
        dotPath.reset()
        when (state) {
            ShieldOverlay.State.SAFE -> {
                markPath.moveTo(0.28f, 0.52f)
                markPath.lineTo(0.44f, 0.67f)
                markPath.lineTo(0.72f, 0.36f)
            }
            ShieldOverlay.State.CAREFUL -> {
                markPath.moveTo(0.5f, 0.36f)
                markPath.lineTo(0.5f, 0.62f)
                dotPath.addCircle(0.5f, 0.78f, 0.065f, Path.Direction.CW)
            }
            else -> {
                markPath.moveTo(0.5f, 0.24f)
                markPath.lineTo(0.5f, 0.56f)
                dotPath.addCircle(0.5f, 0.74f, 0.065f, Path.Direction.CW)
            }
        }
        markPath.transform(matrix)
        canvas.drawPath(markPath, mark)
        if (!dotPath.isEmpty) {
            dotPath.transform(matrix)
            glyph.color = white
            canvas.drawPath(dotPath, glyph)
        }
    }

    /** The doll inside the ring: it rocks with the voice like a roly-poly, dots while thinking, a mic badge while listening. */
    private fun drawDoll(canvas: Canvas, face: android.graphics.Bitmap, cx: Float, cy: Float, radius: Float, box: Float) {
        val inner = radius - 4.5f * d
        val speaking = voice == Voice.SPEAKING
        val scale = if (speaking) 1f + 0.04f * shownLevel else 1f
        val tilt = if (speaking) 6f * shownLevel * kotlin.math.sin(2.0 * Math.PI * now() / SPEAK_SWAY_MS).toFloat() else 0f
        drawDollFace(canvas, face, cx, cy, inner, scale, tilt)
        if (voice == Voice.THINKING) {
            for (i in 0 until 3) {
                val wave = dotWave(i)
                val dx = cx + (i - 1) * 0.22f * box
                val dy = cy + inner - 5f * d - 2f * d * wave
                glyph.color = palette.accent
                canvas.drawCircle(dx, dy, 0.07f * box + 1.2f * d, glyph)
                glyph.color = (0x00FFFFFF) or ((0x90 + (0x6F * wave).toInt()) shl 24)
                canvas.drawCircle(dx, dy, 0.07f * box, glyph)
            }
        } else if (voice == Voice.LISTENING) {
            val bx = cx + inner * 0.72f
            val by = cy + inner * 0.72f
            val r = 7.5f * d
            glyph.color = palette.surface
            canvas.drawCircle(bx, by, r + 1.5f * d, glyph)
            glyph.color = palette.brandRed
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
        if (thinker != null || !ShieldMotion.enabled(context) || !isShown) return
        thinker = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = THINK_MS
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

    /** The verdict lands: the ring fills in its colour, the doll rights itself, the badge scales in. */
    private fun reveal(from: Pair<Float, Float>) {
        revealer?.cancel()
        fromProgress = from.first
        fromTilt = from.second
        revealMs = 0f
        revealer = ValueAnimator.ofFloat(0f, REVEAL_TOTAL_MS.toFloat()).apply {
            duration = REVEAL_TOTAL_MS
            interpolator = LinearInterpolator()
            addUpdateListener {
                revealMs = it.animatedValue as Float
                invalidate()
            }
            addListener(object : android.animation.AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: android.animation.Animator) {
                    if (revealer === animation) revealer = null
                    revealMs = REVEAL_TOTAL_MS.toFloat()
                    invalidate()
                }
            })
            start()
        }
    }

    private fun endReveal() {
        revealer?.cancel()
        revealer = null
        revealMs = REVEAL_TOTAL_MS.toFloat()
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

    private fun startCheck() {
        if (checker == null) checkStart = now()
        if (checker != null || !ShieldMotion.enabled(context) || !isShown) return
        checker = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = ShieldMotion.SWAY_MS
            repeatCount = ValueAnimator.INFINITE
            interpolator = LinearInterpolator()
            addUpdateListener { invalidate() }
            start()
        }
    }

    private fun stopCheck() {
        checker?.cancel()
        checker = null
    }

    override fun onDetachedFromWindow() {
        stopCheck()
        stopThink()
        endReveal()
        super.onDetachedFromWindow()
    }

    /** Loops run only while the bubble can be seen. */
    override fun onVisibilityAggregated(isVisible: Boolean) {
        super.onVisibilityAggregated(isVisible)
        if (!isVisible) {
            checker?.cancel()
            checker = null
            stopThink()
            return
        }
        if (checking()) resumeCheck()
        if (voice == Voice.THINKING) startThink()
    }

    private fun resumeCheck() {
        val started = checkStart
        startCheck()
        if (started != 0L) checkStart = started
    }

    enum class Voice { NONE, LISTENING, MUTED, THINKING, SPEAKING }

    companion object {
        const val CIRCLE_DP = 56
        const val PAD_DP = 12
        private const val BADGE_DELAY_MS = 120L
        private val REVEAL_TOTAL_MS = BADGE_DELAY_MS + ShieldMotion.STEP_MS
        private const val THINK_MS = 1400L
        private const val SPEAK_SWAY_MS = 1400.0
        private const val LEVEL_ATTACK = 0.55f
        private const val LEVEL_RELEASE = 0.18f
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
