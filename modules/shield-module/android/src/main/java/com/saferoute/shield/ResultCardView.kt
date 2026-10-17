package com.saferoute.shield

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.animation.PropertyValuesHolder
import android.animation.ValueAnimator
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.text.TextUtils
import android.view.Gravity
import android.view.MotionEvent
import android.view.VelocityTracker
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.view.animation.PathInterpolator
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.view.ViewCompat
import androidx.core.view.accessibility.AccessibilityNodeInfoCompat
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

internal data class FlagRow(val text: String, val severity: String)

internal data class CardModel(
    val state: ShieldOverlay.State,
    val chip: String,
    val title: String,
    val summary: String,
    val flags: List<FlagRow>,
    val canOpenReport: Boolean,
    val description: String,
    /** Shows the "Ask" mic chip that starts a voice companion session about this result. */
    val canAsk: Boolean = false,
    val askLabel: String = "Ask",
    val askDescription: String = "Ask Kakwe about this result",
    /** In-memory copy of the screenshot that was sent. Never written to disk. */
    val preview: android.graphics.Bitmap? = null,
    val previewLabel: String = "This is what we checked",
    /** A voice notice rather than a check result. Dismissing it keeps the result. */
    val notice: Boolean = false,
    /** Notice pill: a tap opens Kakwe. */
    val opensApp: Boolean = false,
) {
    val canExpand: Boolean get() = state != ShieldOverlay.State.ERROR
}

internal interface CardCallbacks {
    fun onAsk() {}
    fun onPreview() {}
    fun onRetry()
    fun onFullReport()
    fun onDismissClicked()
    fun onSwipedAway()
}

/**
 * The result surface. Collapsed it is a one-line pill. Tapped, it grows into a rounded sheet.
 * Swiping it sideways dismisses it.
 */
internal class ResultCardView(
    context: Context,
    private val palette: ShieldPalette,
    private val fonts: ShieldFonts,
    private val fontScale: Float,
    val model: CardModel,
    private val callbacks: CardCallbacks,
    private val strings: ShieldStrings = ShieldStrings.DEFAULT,
) : LinearLayout(context) {

    private val d = resources.displayMetrics.density
    private val slop = ViewConfiguration.get(context).scaledTouchSlop
    private val shape = GradientDrawable().apply {
        setColor(palette.surface)
        setStroke(maxOf(1, d.toInt()), palette.border)
        cornerRadius = PILL_RADIUS_DP * d
    }
    private val header = LinearLayout(context)
    private val details = LinearLayout(context)
    private lateinit var titleView: TextView
    private val chevron = ChevronView(context, palette.textMuted)

    var collapsedWidth = 0
        private set
    var expandedWidth = 0
        private set
    private var detailsHeight = 0
    private var fraction = 0f
    val isExpanded: Boolean get() = fraction > 0.5f
    private var morph: ValueAnimator? = null
    private var downX = 0f
    private var downY = 0f
    private var dragging = false
    private var velocity: VelocityTracker? = null
    var onExpandChanged: ((Boolean) -> Unit)? = null

    init {
        orientation = VERTICAL
        background = shape
        elevation = 10f * d
        buildHeader()
        if (model.canExpand) buildDetails()
        addView(header, LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        if (model.canExpand) {
            addView(details, LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0))
            details.visibility = GONE
        }
        ViewCompat.addAccessibilityAction(this, strings.dismiss) { _, _ ->
            callbacks.onSwipedAway()
            true
        }
    }

    private fun buildHeader() {
        header.orientation = HORIZONTAL
        header.gravity = Gravity.CENTER_VERTICAL
        header.minimumHeight = dp(48)
        header.setPadding(dp(8), dp(4), dp(if (model.canExpand) 6 else 16), dp(4))
        header.isFocusable = true
        header.contentDescription = model.description
        header.setOnClickListener { if (model.canExpand) toggle(true) else callbacks.onRetry() }
        ViewCompat.replaceAccessibilityAction(
            header,
            AccessibilityNodeInfoCompat.AccessibilityActionCompat.ACTION_CLICK,
            if (model.canExpand) strings.showDetails else strings.tapToRetry,
            null
        )

        val chip = text(model.chip, 12f, palette.chipText(model.state), fonts.bold).apply {
            setPadding(dp(10), dp(5), dp(10), dp(5))
            this.background = GradientDrawable().apply {
                cornerRadius = dp(14).toFloat()
                setColor(palette.chipBackground(model.state))
            }
            maxLines = 1
        }
        header.addView(chip, LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))

        titleView = text(model.title, 14f, palette.textPrimary, fonts.semiBold).apply {
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
        }
        header.addView(titleView, titleParams())
        if (model.canAsk) {
            header.addView(askButton(), LayoutParams(dp(ASK_TARGET_DP), dp(ASK_TARGET_DP)).apply {
                topMargin = -dp(4)
                bottomMargin = -dp(4)
            })
        }
        if (model.canExpand) {
            header.addView(chevron, LayoutParams(dp(36), dp(36)))
        }
    }

    private fun buildDetails() {
        details.orientation = VERTICAL
        details.setPadding(dp(16), dp(2), dp(16), dp(6))
        if (model.summary.isNotBlank()) {
            details.addView(
                text(model.summary, 14f, palette.textSecondary, fonts.regular).apply { maxLines = 4; ellipsize = TextUtils.TruncateAt.END },
                LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            )
        }
        for (flag in model.flags.take(3)) {
            val row = LinearLayout(context).apply {
                orientation = HORIZONTAL
                gravity = Gravity.TOP
                isFocusable = true
                contentDescription = "${strings.severity(flag.severity)}: ${flag.text}"
            }
            row.addView(FlagIconView(context, palette.severity(flag.severity), palette.surface, flag.severity), LayoutParams(dp(18), dp(18)).apply {
                topMargin = dp(1)
            })
            row.addView(
                text(flag.text, 13f, palette.textPrimary, fonts.regular).apply { maxLines = 2; ellipsize = TextUtils.TruncateAt.END },
                LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = dp(10) }
            )
            details.addView(row, LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                topMargin = dp(10)
            })
        }
        model.preview?.let { details.addView(previewRow(it), LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(12) }) }
        val actions = LinearLayout(context).apply { orientation = HORIZONTAL; gravity = Gravity.END }
        actions.addView(textButton(strings.dismiss, palette.textMuted, fonts.semiBold) { callbacks.onDismissClicked() })
        if (model.canOpenReport) {
            actions.addView(textButton(strings.fullReport, palette.accent, fonts.bold) { callbacks.onFullReport() })
        }
        details.addView(actions, LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            topMargin = dp(6)
        })
    }

    private fun askButton(): View {
        fun disc(color: Int) = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(color) }
        val states = android.graphics.drawable.StateListDrawable().apply {
            addState(intArrayOf(android.R.attr.state_pressed), disc(palette.askPressed))
            addState(intArrayOf(), disc(palette.askFill))
        }
        val inset = dp((ASK_TARGET_DP - ASK_DISC_DP) / 2)
        fun inset(drawable: android.graphics.drawable.Drawable) =
            android.graphics.drawable.InsetDrawable(drawable, inset)
        val button = android.widget.FrameLayout(context).apply {
            minimumWidth = dp(ASK_TARGET_DP)
            minimumHeight = dp(ASK_TARGET_DP)
            isClickable = true
            isFocusable = true
            contentDescription = model.askDescription
            background = RippleDrawable(
                ColorStateList.valueOf((palette.askText and 0x00FFFFFF) or 0x33000000),
                inset(states),
                inset(disc(0xFFFFFFFF.toInt()))
            )
            setOnClickListener { callbacks.onAsk() }
        }
        ViewCompat.setTooltipText(button, model.askLabel)
        button.addView(
            MicIconView(context, palette.askText),
            android.widget.FrameLayout.LayoutParams(dp(20), dp(20), Gravity.CENTER)
        )
        return button
    }

    /** "This is what we checked": a small thumbnail of the sent screenshot. Tap to enlarge. */
    private fun previewRow(bitmap: android.graphics.Bitmap): View {
        val row = LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            minimumHeight = dp(48)
            isClickable = true
            isFocusable = true
            contentDescription = model.previewLabel
            setOnClickListener { callbacks.onPreview() }
        }
        val h = dp(PREVIEW_DP)
        val w = maxOf(dp(24), h * bitmap.width / maxOf(1, bitmap.height))
        val image = android.widget.ImageView(context).apply {
            setImageBitmap(bitmap)
            scaleType = android.widget.ImageView.ScaleType.CENTER_CROP
            importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
            background = GradientDrawable().apply {
                cornerRadius = dp(6).toFloat()
                setStroke(maxOf(1, d.toInt()), palette.border)
            }
            clipToOutline = true
        }
        row.addView(image, LayoutParams(w, h))
        row.addView(
            text(model.previewLabel, 13f, palette.textSecondary, fonts.semiBold).apply { maxLines = 2 },
            LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = dp(12) }
        )
        return row
    }

    private fun titleParams() = LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
        marginStart = dp(10)
        marginEnd = dp(4)
    }


    /** Fix the collapsed and expanded sizes. Call once before the card is added to a window. */
    fun prepare(maxExpandedWidth: Int) {
        val limit = min(maxExpandedWidth, dp(344))
        titleView.layoutParams = titleParams().apply { width = ViewGroup.LayoutParams.WRAP_CONTENT; weight = 0f }
        header.measure(
            MeasureSpec.makeMeasureSpec(limit, MeasureSpec.AT_MOST),
            MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED)
        )
        collapsedWidth = max(header.measuredWidth, min(dp(160), limit))
        titleView.layoutParams = titleParams()
        if (model.canExpand) {
            expandedWidth = limit
            details.measure(
                MeasureSpec.makeMeasureSpec(expandedWidth, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED)
            )
            detailsHeight = details.measuredHeight
        } else {
            expandedWidth = collapsedWidth
        }
    }

    fun cancelAnimations() {
        morph?.cancel()
        morph = null
        animate().cancel()
    }

    fun toggle(animate: Boolean) = setExpanded(!isExpanded, animate)

    fun setExpanded(expand: Boolean, animate: Boolean) {
        if (!model.canExpand) return
        val target = if (expand) 1f else 0f
        morph?.cancel()
        onExpandChanged?.invoke(expand)
        announceState(expand)
        if (!animate) {
            apply(target)
            return
        }
        morph = ValueAnimator.ofFloat(fraction, target).apply {
            duration = if (expand) ShieldMotion.STEP_MS else ShieldMotion.FADE_MS
            interpolator = ShieldMotion.OUT
            addUpdateListener { apply(it.animatedValue as Float) }
            addListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    apply(target)
                }
            })
            start()
        }
    }

    private fun announceState(expanded: Boolean) {
        header.contentDescription = model.description + if (expanded) ". ${strings["a11yExpanded"]}" else ""
    }

    fun apply(t: Float) {
        fraction = t
        val lp = layoutParams ?: return
        lp.width = (collapsedWidth + (expandedWidth - collapsedWidth) * t).toInt()
        layoutParams = lp
        if (model.canExpand) {
            details.visibility = if (t > 0f) VISIBLE else GONE
            details.alpha = ((t - DETAILS_FADE_FROM) / (1f - DETAILS_FADE_FROM)).coerceIn(0f, 1f)
            val dlp = details.layoutParams
            dlp.height = (detailsHeight * t).toInt()
            details.layoutParams = dlp
            chevron.rotation = 180f * t
        }
        shape.cornerRadius = (PILL_RADIUS_DP + (SHEET_RADIUS_DP - PILL_RADIUS_DP) * t) * d
        invalidateOutline()
    }

    override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
        when (ev.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downX = ev.rawX
                downY = ev.rawY
                dragging = false
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = ev.rawX - downX
                if (!dragging && abs(dx) > slop && abs(dx) > abs(ev.rawY - downY)) {
                    dragging = true
                    beginDrag(ev)
                    return true
                }
            }
        }
        return false
    }

    override fun onTouchEvent(ev: MotionEvent): Boolean {
        when (ev.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downX = ev.rawX
                downY = ev.rawY
                return true
            }
            MotionEvent.ACTION_MOVE -> if (dragging) {
                velocity?.addMovement(ev)
                val dx = ev.rawX - downX
                translationX = dx
                alpha = max(0.2f, 1f - abs(dx) / (width * 1.2f))
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> if (dragging) endDrag(ev.actionMasked == MotionEvent.ACTION_UP)
        }
        return true
    }

    private fun beginDrag(ev: MotionEvent) {
        parent?.requestDisallowInterceptTouchEvent(true)
        velocity = VelocityTracker.obtain().also { it.addMovement(ev) }
    }

    private fun endDrag(released: Boolean) {
        dragging = false
        val tracker = velocity
        tracker?.computeCurrentVelocity(1000)
        val vx = tracker?.xVelocity ?: 0f
        tracker?.recycle()
        velocity = null
        val far = abs(translationX) > width * 0.4f
        val flung = abs(vx) > 900f && vx * translationX > 0
        if (released && (far || flung)) {
            val dir = if (translationX >= 0) 1 else -1
            animate().translationX(dir * width * 1.1f).alpha(0f).setDuration(140).withEndAction {
                callbacks.onSwipedAway()
            }.start()
        } else {
            animate().translationX(0f).alpha(1f).setDuration(180).setInterpolator(EASE).start()
        }
    }

    private fun text(value: String, sp: Float, color: Int, face: Typeface) = TextView(context).apply {
        text = value
        setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, sp * d * fontScale)
        setTextColor(color)
        typeface = face
        includeFontPadding = false
        setLineSpacing(0f, 1.15f)
    }

    private fun textButton(label: String, color: Int, face: Typeface, onClick: () -> Unit): TextView =
        text(label, 14f, color, face).apply {
            gravity = Gravity.CENTER
            minHeight = dp(48)
            minWidth = dp(48)
            setPadding(dp(14), 0, dp(14), 0)
            isClickable = true
            isFocusable = true
            contentDescription = label
            val mask = GradientDrawable().apply { cornerRadius = dp(12).toFloat(); setColor(0xFFFFFFFF.toInt()) }
            this.background = RippleDrawable(ColorStateList.valueOf((color and 0x00FFFFFF) or 0x22000000), null, mask)
            setOnClickListener { onClick() }
        }

    private fun dp(v: Int) = (v * d).toInt()

    private class ChevronView(context: Context, color: Int) : View(context) {
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color
            style = Paint.Style.STROKE
            strokeCap = Paint.Cap.ROUND
            strokeJoin = Paint.Join.ROUND
            strokeWidth = 2f * resources.displayMetrics.density
        }

        init {
            importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
        }

        override fun onDraw(canvas: Canvas) {
            val cx = width / 2f
            val cy = height / 2f
            val a = 5f * resources.displayMetrics.density
            canvas.drawLine(cx - a, cy - a / 2, cx, cy + a / 2, paint)
            canvas.drawLine(cx, cy + a / 2, cx + a, cy - a / 2, paint)
        }
    }

    internal class MicIconView(context: Context, private val tint: Int) : View(context) {
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = tint
            strokeCap = Paint.Cap.ROUND
        }
        private val oval = android.graphics.RectF()

        val paintColorForTest: Int get() = paint.color

        init {
            importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
        }

        override fun onDraw(canvas: Canvas) {
            val w = width.toFloat()
            val h = height.toFloat()
            paint.style = Paint.Style.FILL
            oval.set(w * 0.36f, h * 0.06f, w * 0.64f, h * 0.58f)
            canvas.drawRoundRect(oval, w * 0.14f, w * 0.14f, paint)
            paint.style = Paint.Style.STROKE
            paint.strokeWidth = w * 0.09f
            oval.set(w * 0.22f, h * 0.20f, w * 0.78f, h * 0.74f)
            canvas.drawArc(oval, 20f, 140f, false, paint)
            canvas.drawLine(w * 0.5f, h * 0.74f, w * 0.5f, h * 0.9f, paint)
        }
    }

    /** Severity mark shaped like the app's: octagon (high), triangle (medium), circle (low). */
    private class FlagIconView(context: Context, private val color: Int, private val glyph: Int, private val severity: String) : View(context) {
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        private val shape = android.graphics.Path()

        init {
            importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
        }

        override fun onDraw(canvas: Canvas) {
            val d = resources.displayMetrics.density
            val cx = width / 2f
            val cy = height / 2f
            paint.style = Paint.Style.FILL
            paint.color = color
            val r = 9f * d
            shape.reset()
            when (severity) {
                "high" -> {
                    val a = 0.41f * r
                    shape.moveTo(cx - a, cy - r)
                    shape.lineTo(cx + a, cy - r)
                    shape.lineTo(cx + r, cy - a)
                    shape.lineTo(cx + r, cy + a)
                    shape.lineTo(cx + a, cy + r)
                    shape.lineTo(cx - a, cy + r)
                    shape.lineTo(cx - r, cy + a)
                    shape.lineTo(cx - r, cy - a)
                    shape.close()
                }
                "medium" -> {
                    shape.moveTo(cx, cy - r * 1.05f)
                    shape.lineTo(cx + r * 1.1f, cy + r * 0.9f)
                    shape.lineTo(cx - r * 1.1f, cy + r * 0.9f)
                    shape.close()
                }
                else -> shape.addCircle(cx, cy, r, android.graphics.Path.Direction.CW)
            }
            canvas.drawPath(shape, paint)
            if (severity == "medium") canvas.translate(0f, 1.5f * d)
            paint.color = glyph
            paint.style = Paint.Style.STROKE
            paint.strokeCap = Paint.Cap.ROUND
            paint.strokeWidth = 1.8f * d
            canvas.drawLine(cx, cy - 4f * d, cx, cy + 1f * d, paint)
            paint.style = Paint.Style.FILL
            canvas.drawCircle(cx, cy + 4f * d, 1.1f * d, paint)
        }
    }

    /** Grows out of the bubble: fades in fast, scales up with a restrained overshoot. Set the pivot first. */
    fun enterAnimator(): Animator = popIn(this, ENTER_SCALE)

    companion object {
        const val ENTER_SCALE = 0.8f
        const val EXIT_SCALE = 0.85f
        private const val DETAILS_FADE_FROM = 0.35f

        fun popIn(view: View, from: Float): Animator {
            view.alpha = 0f
            view.scaleX = from
            view.scaleY = from
            val fade = ObjectAnimator.ofFloat(view, View.ALPHA, 0f, 1f).apply {
                duration = ShieldMotion.EXIT_MS
                interpolator = ShieldMotion.OUT
            }
            val grow = ObjectAnimator.ofPropertyValuesHolder(
                view,
                PropertyValuesHolder.ofFloat(View.SCALE_X, from, 1f),
                PropertyValuesHolder.ofFloat(View.SCALE_Y, from, 1f)
            ).apply {
                duration = ShieldMotion.STEP_MS
                interpolator = ShieldMotion.POP
            }
            return AnimatorSet().apply { playTogether(fade, grow) }
        }

        const val PILL_RADIUS_DP = 24f
        const val PREVIEW_DP = 72
        const val ASK_DISC_DP = 40
        const val ASK_TARGET_DP = 48
        const val SHEET_RADIUS_DP = 20f
        val EASE = PathInterpolator(0.2f, 0f, 0f, 1f)
    }
}
