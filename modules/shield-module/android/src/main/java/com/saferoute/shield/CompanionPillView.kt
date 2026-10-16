package com.saferoute.shield

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Compact companion pill: a short status word, a mute toggle and an End cross. It shows no transcript text;
 * the status chip is a polite live region, so TalkBack announces each status change.
 */
internal class CompanionPillView(
    context: Context,
    private val palette: ShieldPalette,
    private val fonts: ShieldFonts,
    private val fontScale: Float,
    private val strings: ShieldStrings,
    onMute: () -> Unit,
    onEnd: () -> Unit,
) : LinearLayout(context) {

    private val d = resources.displayMetrics.density
    private val chip: TextView
    private val mute: MuteToggleView
    private val end: View
    val endViewForTest: View get() = end
    private val chipShape = GradientDrawable().apply { cornerRadius = 14 * d }
    var chipText: String = ""
        private set
    val chipViewForTest: TextView get() = chip
    val muteViewForTest: View get() = mute

    init {
        orientation = HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        minimumHeight = dp(48)
        setPadding(dp(8), dp(4), dp(4), dp(4))
        background = GradientDrawable().apply {
            setColor(palette.surface)
            setStroke(maxOf(1, d.toInt()), palette.border)
            cornerRadius = ResultCardView.PILL_RADIUS_DP * d
        }
        elevation = 10f * d
        chip = text(12f, palette.textPrimary, fonts.bold).apply {
            setPadding(dp(10), dp(5), dp(10), dp(5))
            background = chipShape
            maxLines = 2
            accessibilityLiveRegion = ACCESSIBILITY_LIVE_REGION_POLITE
        }
        addView(chip, LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            marginEnd = dp(4)
        })
        mute = MuteToggleView(context, palette.textPrimary, palette.textMuted).apply {
            isClickable = true
            isFocusable = true
            val mask = GradientDrawable().apply { cornerRadius = dp(24).toFloat(); setColor(0xFFFFFFFF.toInt()) }
            background = RippleDrawable(ColorStateList.valueOf(0x22000000), null, mask)
            setOnClickListener { onMute() }
        }
        addView(mute, LayoutParams(dp(48), dp(48)))
        end = EndView(context, palette.accent).apply {
            isClickable = true
            isFocusable = true
            contentDescription = strings.endA11y
            val mask = GradientDrawable().apply { cornerRadius = dp(24).toFloat(); setColor(0xFFFFFFFF.toInt()) }
            background = RippleDrawable(ColorStateList.valueOf(0x22000000), null, mask)
            setOnClickListener { onEnd() }
        }
        addView(end, LayoutParams(dp(48), dp(48)))
    }

    /** Caps the status chip so the whole pill fits in [maxPx]; a long word wraps to a second line instead of being cut. */
    fun fitTo(maxPx: Int) {
        chip.maxWidth = maxOf(dp(48), maxPx - paddingLeft - paddingRight - dp(4) - dp(48) - dp(48))
    }

    /** Grows out of the bubble like the result card. Set the pivot first. */
    fun enterAnimator(): android.animation.Animator = ResultCardView.popIn(this, ENTER_SCALE)

    fun render(view: CompanionView, verdict: ShieldOverlay.State) {
        val label = labelFor(view, strings)
        if (label != chipText && chipText.isNotEmpty()) {
            chip.animate().cancel()
            chip.alpha = CHIP_FADE_FROM
            chip.animate().alpha(1f).setDuration(ShieldMotion.FADE_MS).setInterpolator(ShieldMotion.OUT).start()
        }
        chipText = label
        chip.text = label
        chip.contentDescription = "${strings.name}. $label"
        val tint = if (view.muted || view.paused) ShieldOverlay.State.ERROR else verdict
        chipShape.setColor(palette.chipBackground(tint))
        chip.setTextColor(palette.chipText(tint))
        val off = view.muted || view.paused
        mute.muted = off
        mute.visibility = if (view.live) View.VISIBLE else View.GONE
        mute.contentDescription = if (off) strings.unmuteA11y else strings.muteA11y
    }

    private fun text(sp: Float, color: Int, face: Typeface) = TextView(context).apply {
        setTextSize(TypedValue.COMPLEX_UNIT_PX, sp * d * fontScale)
        setTextColor(color)
        typeface = face
        includeFontPadding = false
    }

    private fun dp(v: Int) = (v * d).toInt()

    /** End control: a cross in the interactive colour. */
    private class EndView(context: Context, private val color: Int) : View(context) {
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            strokeCap = Paint.Cap.ROUND
            style = Paint.Style.STROKE
        }

        override fun onDraw(canvas: Canvas) {
            val d = resources.displayMetrics.density
            val a = 6.5f * d
            val cx = width / 2f
            val cy = height / 2f
            paint.color = color
            paint.strokeWidth = 2.4f * d
            canvas.drawLine(cx - a, cy - a, cx + a, cy + a, paint)
            canvas.drawLine(cx + a, cy - a, cx - a, cy + a, paint)
        }
    }

    /** Mic glyph; a slash when muted. */
    private class MuteToggleView(context: Context, private val on: Int, private val off: Int) : View(context) {
        var muted = false
            set(value) {
                field = value
                invalidate()
            }
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { strokeCap = Paint.Cap.ROUND }
        private val rect = RectF()

        override fun onDraw(canvas: Canvas) {
            val s = 20f * resources.displayMetrics.density
            val x = (width - s) / 2f
            val y = (height - s) / 2f
            paint.color = if (muted) off else on
            paint.style = Paint.Style.FILL
            rect.set(x + s * 0.34f, y + s * 0.04f, x + s * 0.66f, y + s * 0.60f)
            canvas.drawRoundRect(rect, s * 0.16f, s * 0.16f, paint)
            paint.style = Paint.Style.STROKE
            paint.strokeWidth = s * 0.1f
            rect.set(x + s * 0.18f, y + s * 0.20f, x + s * 0.82f, y + s * 0.78f)
            canvas.drawArc(rect, 20f, 140f, false, paint)
            canvas.drawLine(x + s * 0.5f, y + s * 0.78f, x + s * 0.5f, y + s * 0.96f, paint)
            if (muted) canvas.drawLine(x + s * 0.12f, y + s * 0.08f, x + s * 0.88f, y + s * 0.92f, paint)
        }
    }

    companion object {
        private const val ENTER_SCALE = 0.9f
        private const val CHIP_FADE_FROM = 0.3f

        fun labelFor(view: CompanionView, strings: ShieldStrings): String = when {
            view.paused -> strings.paused
            view.muted && view.live -> strings.muted
            else -> when (view.state) {
                CompanionState.CHECKING -> strings.checking
                CompanionState.RECHECKING -> strings.rechecking
                CompanionState.WARNING -> strings.warning
                CompanionState.CONNECTING -> strings.connecting
                CompanionState.LISTENING -> strings.listening
                CompanionState.THINKING -> strings.thinking
                CompanionState.SPEAKING -> strings.speaking
                else -> strings.voiceChip
            }
        }

        fun voiceFor(view: CompanionView): BubbleView.Voice = when {
            !view.live -> when (view.state) {
                CompanionState.WARNING -> BubbleView.Voice.SPEAKING
                CompanionState.CONNECTING -> BubbleView.Voice.THINKING
                else -> BubbleView.Voice.NONE
            }
            view.muted || view.paused -> BubbleView.Voice.MUTED
            view.state == CompanionState.SPEAKING -> BubbleView.Voice.SPEAKING
            view.state == CompanionState.THINKING -> BubbleView.Voice.THINKING
            else -> BubbleView.Voice.LISTENING
        }
    }
}
