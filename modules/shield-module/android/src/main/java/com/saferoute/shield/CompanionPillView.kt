package com.saferoute.shield

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView

/** One-line companion pill: state chip, latest model line, End. */
internal class CompanionPillView(
    context: Context,
    private val palette: ShieldPalette,
    private val fonts: ShieldFonts,
    private val fontScale: Float,
    private val strings: ShieldStrings,
    onEnd: () -> Unit,
) : LinearLayout(context) {

    private val d = resources.displayMetrics.density
    private val chip: TextView
    private val caption: TextView
    private val chipShape = GradientDrawable().apply { cornerRadius = 14 * d }
    var chipText: String = ""
        private set
    var captionText: String = ""
        private set

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
            maxLines = 1
        }
        addView(chip, LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        caption = text(14f, palette.textPrimary, fonts.semiBold).apply {
            maxLines = 1
            isSingleLine = true
            ellipsize = TextUtils.TruncateAt.START
            accessibilityLiveRegion = ACCESSIBILITY_LIVE_REGION_POLITE
        }
        addView(caption, LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
            marginStart = dp(10)
            marginEnd = dp(4)
        })
        val end = text(14f, palette.ring(ShieldOverlay.State.DANGER), fonts.bold).apply {
            this.text = strings.end
            gravity = Gravity.CENTER
            minHeight = dp(48)
            minWidth = dp(48)
            setPadding(dp(14), 0, dp(14), 0)
            isClickable = true
            isFocusable = true
            contentDescription = strings.endA11y
            val mask = GradientDrawable().apply { cornerRadius = dp(12).toFloat(); setColor(0xFFFFFFFF.toInt()) }
            background = RippleDrawable(ColorStateList.valueOf(0x22000000), null, mask)
            setOnClickListener { onEnd() }
        }
        addView(end, LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))
    }

    fun render(view: CompanionView, verdict: ShieldOverlay.State) {
        val label = labelFor(view, strings)
        chipText = label
        chip.text = label
        val tint = if (view.muted || view.paused) ShieldOverlay.State.ERROR else verdict
        chipShape.setColor(palette.chipBackground(tint))
        chip.setTextColor(palette.chipText(tint))
        val line = when {
            view.micBlocked && view.live -> strings.needsForeground
            view.caption.isNotBlank() -> view.caption
            view.live -> strings.captionHint
            else -> ""
        }
        captionText = line
        caption.text = line
        caption.setTextColor(if (view.caption.isNotBlank()) palette.textPrimary else palette.textMuted)
        contentDescription = "$label. $line"
    }

    private fun text(sp: Float, color: Int, face: Typeface) = TextView(context).apply {
        setTextSize(TypedValue.COMPLEX_UNIT_PX, sp * d * fontScale)
        setTextColor(color)
        typeface = face
        includeFontPadding = false
    }

    private fun dp(v: Int) = (v * d).toInt()

    companion object {
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
