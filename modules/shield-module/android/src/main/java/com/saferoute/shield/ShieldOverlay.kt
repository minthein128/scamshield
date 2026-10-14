package com.saferoute.shield

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.PropertyValuesHolder
import android.animation.ObjectAnimator
import android.annotation.SuppressLint
import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.core.view.ViewCompat
import androidx.dynamicanimation.animation.FloatPropertyCompat
import androidx.dynamicanimation.animation.SpringAnimation
import androidx.dynamicanimation.animation.SpringForce
import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min

/**
 * Floating shield bubble, result pill or sheet and close target.
 * Plain Views in WindowManager overlays: no Compose lifecycle owners are needed in a Service.
 * Every method must run on the main thread.
 */
class ShieldOverlay(private val context: Context, private val listener: Listener) {

    interface Listener {
        fun onBallTap()
        fun onOpenReport()
        fun onDismiss()
        fun onClose()
    }

    enum class State { IDLE, CHECKING, SAFE, CAREFUL, DANGER, ERROR }

    var state = State.IDLE
        private set

    private val main = Handler(Looper.getMainLooper())
    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val density = context.resources.displayMetrics.density
    private val fonts = ShieldFonts(context)
    private var palette = ShieldPalette.forContext(context)
    private val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
        @Suppress("DEPRECATION")
        WindowManager.LayoutParams.TYPE_PHONE
    }
    private val baseFlags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
        WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED

    private val pad = dp(BubbleView.PAD_DP)
    private val bubbleSize = dp(BubbleView.CIRCLE_DP + 2 * BubbleView.PAD_DP)
    private val edgeMargin = dp(6)
    private val tuckDepth = dp(20)
    private val bubble = BubbleView(context, palette)
    private val bubbleParams = WindowManager.LayoutParams(
        bubbleSize, bubbleSize, overlayType, baseFlags, PixelFormat.TRANSLUCENT
    ).apply {
        gravity = Gravity.TOP or Gravity.START
        x = restingX(left = false, tucked = false)
        y = (screenH() * 0.35).toInt()
    }
    private var bubbleAttached = false
    private var onLeft = false
    private var tucked = false
    private var dragging = false
    private var xSpring: SpringAnimation? = null
    private var ySpring: SpringAnimation? = null

    private var targetView: CloseTargetView? = null
    private var targetParams: WindowManager.LayoutParams? = null
    private var overTarget = false

    private var cardRoot: FrameLayout? = null
    private var cardView: ResultCardView? = null
    private var cardModel: CardModel? = null
    private var cardClosing = false
    private var hiddenByDrag = false
    private var lastJson: JSONObject? = null

    private val autoCollapse = Runnable { collapseSafeResult() }
    private val tuckLater = Runnable { if (state == State.IDLE && !dragging) tuck(true) }

    private val xProperty = object : FloatPropertyCompat<ShieldOverlay>("bubbleX") {
        override fun getValue(o: ShieldOverlay) = bubbleParams.x.toFloat()
        override fun setValue(o: ShieldOverlay, value: Float) {
            bubbleParams.x = value.toInt()
            updateBubble()
        }
    }
    private val yProperty = object : FloatPropertyCompat<ShieldOverlay>("bubbleY") {
        override fun getValue(o: ShieldOverlay) = bubbleParams.y.toFloat()
        override fun setValue(o: ShieldOverlay, value: Float) {
            bubbleParams.y = value.toInt()
            updateBubble()
        }
    }

    @SuppressLint("ClickableViewAccessibility")
    fun show() {
        if (bubbleAttached) return
        bubble.setOnTouchListener(dragListener())
        bubble.setOnClickListener { listener.onBallTap() }
        bubble.setOnLongClickListener {
            closeBubble()
            true
        }
        ViewCompat.addAccessibilityAction(bubble, "Close shield") { _, _ ->
            closeBubble()
            true
        }
        describeBubble()
        windowManager.addView(bubble, bubbleParams)
        bubbleAttached = true
        onLeft = false
        main.postDelayed(tuckLater, TUCK_DELAY_MS)
    }

    fun remove() {
        main.removeCallbacksAndMessages(null)
        removeCardNow()
        removeTarget()
        xSpring?.cancel()
        ySpring?.cancel()
        if (bubbleAttached) {
            try {
                windowManager.removeView(bubble)
            } catch (_: Exception) {
            }
            bubbleAttached = false
        }
    }

    fun hideForCapture() {
        main.removeCallbacks(autoCollapse)
        bubble.animate().cancel()
        bubble.visibility = View.INVISIBLE
        cardRoot?.visibility = View.INVISIBLE
    }

    fun setChecking() {
        removeCardNow()
        cardModel = null
        setState(State.CHECKING)
        untuck()
        bubble.visibility = View.VISIBLE
        bubble.alpha = 0f
        bubble.scaleX = 0.7f
        bubble.scaleY = 0.7f
        bubble.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(220)
            .setInterpolator(ResultCardView.EASE).start()
    }

    fun setResult(json: JSONObject) {
        lastJson = json
        val verdict = json.optString("verdict")
        val next = when (verdict) {
            "safe" -> State.SAFE
            "danger" -> State.DANGER
            else -> State.CAREFUL
        }
        setState(next)
        untuck()
        showBubbleNow()
        val title = json.optString("title").ifBlank { ShieldPalette.chipLabel(next) }
        val summary = json.optString("summary")
        val chip = ShieldPalette.chipLabel(next)
        val model = CardModel(
            state = next,
            chip = chip,
            title = title,
            summary = summary,
            flags = flagRows(json),
            canOpenReport = true,
            description = "$chip. $title"
        )
        showCard(model, animate = true)
        when (next) {
            State.SAFE -> {
                ShieldHaptics.safe(context)
                main.postDelayed(autoCollapse, AUTO_COLLAPSE_MS)
            }
            State.CAREFUL -> ShieldHaptics.careful(context)
            else -> {
                ShieldHaptics.danger(context)
                bubble.announceForAccessibility("High risk. $title. $summary")
            }
        }
    }

    fun setError(message: String) {
        removeCardNow()
        setState(State.ERROR)
        untuck()
        showBubbleNow()
        val chip = ShieldPalette.errorLabel(message)
        showCard(
            CardModel(State.ERROR, chip, "Tap to retry", message, emptyList(), false, "$chip. $message. Double tap to retry."),
            animate = true
        )
    }

    fun reset() {
        main.removeCallbacks(autoCollapse)
        dismissCard(animated = true)
        cardModel = null
        setState(State.IDLE)
        showBubbleNow()
        main.removeCallbacks(tuckLater)
        main.postDelayed(tuckLater, TUCK_DELAY_MS)
    }

    fun toggleCard() {
        if (cardRoot != null && !cardClosing) {
            dismissCard(animated = true)
        } else {
            cardModel?.let { showCard(it, animate = true) }
        }
    }

    /** Called when the system theme or font scale changed. */
    fun refreshTheme() {
        palette = ShieldPalette.forContext(context)
        bubble.palette = palette
        val model = cardModel
        if (cardRoot != null && model != null) showCard(model, animate = false)
    }

    private fun collapseSafeResult() {
        if (state == State.SAFE) listener.onDismiss()
    }

    private fun setState(next: State) {
        state = next
        bubble.shieldState = next
        describeBubble()
    }

    private fun describeBubble() {
        val text = when (state) {
            State.IDLE -> "SafeRoute Shield. Double tap to check the screen."
            State.CHECKING -> "SafeRoute Shield. Checking the screen."
            State.SAFE -> "SafeRoute Shield. Result: safe. Double tap to show details."
            State.CAREFUL -> "SafeRoute Shield. Result: be careful. Double tap to show details."
            State.DANGER -> "SafeRoute Shield. Result: high risk. Double tap to show details."
            State.ERROR -> "SafeRoute Shield. The check failed. Double tap to retry."
        }
        bubble.contentDescription = text
    }

    private fun showBubbleNow() {
        bubble.animate().cancel()
        bubble.visibility = View.VISIBLE
        bubble.alpha = 1f
        bubble.scaleX = 1f
        bubble.scaleY = 1f
    }

    private fun flagRows(json: JSONObject): List<FlagRow> {
        val flags = json.optJSONArray("flags") ?: return emptyList()
        val rows = ArrayList<FlagRow>()
        for (i in 0 until min(3, flags.length())) {
            val flag = flags.optJSONObject(i) ?: continue
            val label = flag.optString("label")
            val evidence = flag.optString("evidence")
            val line = if (evidence.isBlank()) label else "$label: $evidence"
            if (line.isNotBlank()) rows.add(FlagRow(line, flag.optString("severity", "low")))
        }
        return rows
    }

    // ---- result surface ----

    private fun showCard(model: CardModel, animate: Boolean) {
        removeCardNow()
        cardModel = model
        val view = ResultCardView(context, palette, fonts, fontScale(), model, object : CardCallbacks {
            override fun onRetry() = listener.onBallTap()
            override fun onFullReport() = listener.onOpenReport()
            override fun onDismissClicked() = listener.onDismiss()
            override fun onSwipedAway() = listener.onDismiss()
        })
        view.onExpandChanged = { expanded -> if (expanded) main.removeCallbacks(autoCollapse) }
        view.prepare(screenW() - dp(48))
        val root = FrameLayout(context).apply {
            clipChildren = false
            clipToPadding = false
            setPadding(pad, pad, pad, pad)
        }
        root.addView(
            view,
            FrameLayout.LayoutParams(view.collapsedWidth, FrameLayout.LayoutParams.WRAP_CONTENT, if (onLeft) Gravity.START else Gravity.END)
        )
        val belowBubble = bubbleCenterY() < screenH() / 2
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType,
            baseFlags,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = (if (belowBubble) Gravity.TOP else Gravity.BOTTOM) or (if (onLeft) Gravity.START else Gravity.END)
            x = 0
            y = if (belowBubble) {
                bubbleParams.y + pad + dp(BubbleView.CIRCLE_DP) + dp(8) - pad
            } else {
                screenH() - bubbleParams.y - pad + dp(8) - pad
            }
        }
        if (animate) view.alpha = 0f
        try {
            windowManager.addView(root, params)
        } catch (_: Exception) {
            return
        }
        cardRoot = root
        cardView = view
        cardClosing = false
        if (animate) {
            view.addOnLayoutChangeListener(object : View.OnLayoutChangeListener {
                override fun onLayoutChange(v: View, l: Int, t: Int, r: Int, b: Int, ol: Int, ot: Int, oldR: Int, ob: Int) {
                    v.removeOnLayoutChangeListener(this)
                    playCardEnter(view)
                }
            })
        }
    }

    private fun playCardEnter(view: ResultCardView) {
        aimPivotAtBubble(view)
        view.scaleX = 0.45f
        view.scaleY = 0.45f
        ObjectAnimator.ofPropertyValuesHolder(
            view,
            PropertyValuesHolder.ofFloat(View.ALPHA, 0f, 1f),
            PropertyValuesHolder.ofFloat(View.SCALE_X, 0.45f, 1f),
            PropertyValuesHolder.ofFloat(View.SCALE_Y, 0.45f, 1f)
        ).apply {
            duration = 200
            interpolator = ResultCardView.EASE
            start()
        }
    }

    private fun aimPivotAtBubble(view: View) {
        val loc = IntArray(2)
        view.getLocationOnScreen(loc)
        view.pivotX = (bubbleParams.x + bubbleSize / 2f) - loc[0]
        view.pivotY = (bubbleParams.y + bubbleSize / 2f) - loc[1]
    }

    private fun dismissCard(animated: Boolean) {
        val root = cardRoot ?: return
        val view = cardView
        if (!animated || view == null || cardClosing) {
            if (!animated) removeCardNow()
            return
        }
        cardClosing = true
        aimPivotAtBubble(view)
        view.animate().cancel()
        view.animate().alpha(0f).scaleX(0.5f).scaleY(0.5f).setDuration(170)
            .setInterpolator(ResultCardView.EASE)
            .setListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    if (cardRoot === root) removeCardNow()
                }
            }).start()
    }

    private fun removeCardNow() {
        main.removeCallbacks(autoCollapse)
        val root = cardRoot ?: return
        cardView?.animate()?.cancel()
        try {
            windowManager.removeView(root)
        } catch (_: Exception) {
        }
        cardRoot = null
        cardView = null
        cardClosing = false
    }

    // ---- bubble position ----

    private fun restingX(left: Boolean, tucked: Boolean): Int {
        val depth = if (tucked) tuckDepth else 0
        return if (left) -pad + edgeMargin - depth else screenW() - bubbleSize + pad - edgeMargin + depth
    }

    private fun bubbleCenterX() = bubbleParams.x + bubbleSize / 2
    private fun bubbleCenterY() = bubbleParams.y + bubbleSize / 2

    private fun untuck() {
        main.removeCallbacks(tuckLater)
        if (tucked) tuck(false)
    }

    private fun tuck(value: Boolean) {
        if (value == tucked || dragging) return
        tucked = value
        springTo(xProperty, restingX(onLeft, value).toFloat(), SPRING_SOFT)
    }

    private fun snapToEdge() {
        onLeft = bubbleCenterX() < screenW() / 2
        val minY = dp(24)
        val maxY = screenH() - bubbleSize - dp(48)
        tucked = false
        springTo(xProperty, restingX(onLeft, false).toFloat(), SPRING_BOUNCY) {
            if (hiddenByDrag) {
                hiddenByDrag = false
                cardModel?.let { showCard(it, animate = true) }
            }
        }
        val clampedY = bubbleParams.y.coerceIn(minY, max(minY, maxY))
        if (clampedY != bubbleParams.y) springTo(yProperty, clampedY.toFloat(), SPRING_SOFT)
        main.removeCallbacks(tuckLater)
        if (state == State.IDLE) main.postDelayed(tuckLater, TUCK_DELAY_MS)
    }

    private fun springTo(
        property: FloatPropertyCompat<ShieldOverlay>,
        target: Float,
        damping: Float,
        onEnd: (() -> Unit)? = null
    ) {
        val isX = property === xProperty
        (if (isX) xSpring else ySpring)?.cancel()
        val spring = SpringAnimation(this, property).apply {
            this.spring = SpringForce(target).apply {
                dampingRatio = damping
                stiffness = SpringForce.STIFFNESS_LOW + 150f
            }
            setMinimumVisibleChange(1f)
            if (onEnd != null) addEndListener { _, _, _, _ -> onEnd() }
        }
        if (isX) xSpring = spring else ySpring = spring
        spring.start()
    }

    private fun updateBubble() {
        if (!bubbleAttached) return
        try {
            windowManager.updateViewLayout(bubble, bubbleParams)
        } catch (_: Exception) {
        }
    }

    // ---- drag, tap, long press, close target ----

    @SuppressLint("ClickableViewAccessibility")
    private fun dragListener() = object : View.OnTouchListener {
        private var startX = 0
        private var startY = 0
        private var touchX = 0f
        private var touchY = 0f
        private var moved = false
        private var longPressed = false
        private val slop = ViewConfiguration.get(context).scaledTouchSlop.coerceAtLeast(dp(6))
        private val longPress = Runnable {
            if (!moved) {
                longPressed = true
                ShieldHaptics.tick(context)
                closeBubble()
            }
        }

        override fun onTouch(v: View, event: MotionEvent): Boolean {
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    xSpring?.cancel()
                    ySpring?.cancel()
                    main.removeCallbacks(tuckLater)
                    startX = bubbleParams.x
                    startY = bubbleParams.y
                    touchX = event.rawX
                    touchY = event.rawY
                    moved = false
                    longPressed = false
                    main.postDelayed(longPress, ViewConfiguration.getLongPressTimeout().toLong() + 200)
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    if (longPressed) return true
                    val dx = (event.rawX - touchX).toInt()
                    val dy = (event.rawY - touchY).toInt()
                    if (!moved && (abs(dx) > slop || abs(dy) > slop)) {
                        moved = true
                        main.removeCallbacks(longPress)
                        beginDrag()
                    }
                    if (moved) {
                        followFinger(startX + dx, startY + dy)
                    }
                    return true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    main.removeCallbacks(longPress)
                    if (longPressed) return true
                    if (moved) {
                        endDrag(event.actionMasked == MotionEvent.ACTION_UP)
                    } else if (event.actionMasked == MotionEvent.ACTION_UP) {
                        v.performClick()
                    }
                    return true
                }
            }
            return false
        }
    }

    private fun beginDrag() {
        dragging = true
        tucked = false
        if (cardRoot != null && !cardClosing) {
            hiddenByDrag = true
            dismissCard(animated = true)
        }
        showTarget()
    }

    private fun followFinger(rawX: Int, rawY: Int) {
        val target = targetCenter()
        val cx = rawX + bubbleSize / 2f
        val cy = rawY + bubbleSize / 2f
        val near = hypot(cx - target.first, cy - target.second) < dp(84)
        if (near != overTarget) {
            overTarget = near
            if (near) ShieldHaptics.tick(context)
            targetView?.animate()?.scaleX(if (near) 1.25f else 1f)?.scaleY(if (near) 1.25f else 1f)?.setDuration(120)?.start()
        }
        if (near) {
            bubbleParams.x = (target.first - bubbleSize / 2f).toInt()
            bubbleParams.y = (target.second - bubbleSize / 2f).toInt()
        } else {
            bubbleParams.x = rawX
            bubbleParams.y = rawY
        }
        updateBubble()
    }

    private fun endDrag(released: Boolean) {
        dragging = false
        val close = released && overTarget
        overTarget = false
        hideTarget()
        if (close) {
            hiddenByDrag = false
            closeBubble()
        } else {
            snapToEdge()
        }
    }

    private fun targetCenter(): Pair<Float, Float> =
        Pair(screenW() / 2f, screenH() - dp(48) - dp(CLOSE_BOX_DP) / 2f)

    private fun showTarget() {
        if (targetView != null) return
        val view = CloseTargetView(context, palette)
        val box = dp(CLOSE_BOX_DP)
        val params = WindowManager.LayoutParams(
            box, box, overlayType,
            baseFlags or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            y = dp(48)
        }
        view.alpha = 0f
        view.translationY = dp(24).toFloat()
        try {
            windowManager.addView(view, params)
        } catch (_: Exception) {
            return
        }
        targetView = view
        targetParams = params
        view.animate().alpha(1f).translationY(0f).setDuration(160).setInterpolator(ResultCardView.EASE).start()
    }

    private fun hideTarget() {
        val view = targetView ?: return
        targetView = null
        view.animate().alpha(0f).translationY(dp(24).toFloat()).setDuration(140)
            .setListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    try {
                        windowManager.removeView(view)
                    } catch (_: Exception) {
                    }
                }
            }).start()
    }

    private fun removeTarget() {
        val view = targetView ?: return
        targetView = null
        try {
            windowManager.removeView(view)
        } catch (_: Exception) {
        }
    }

    private fun closeBubble() {
        main.removeCallbacks(tuckLater)
        main.removeCallbacks(autoCollapse)
        removeCardNow()
        bubble.animate().cancel()
        bubble.animate().alpha(0f).scaleX(0.3f).scaleY(0.3f).setDuration(160)
            .setListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    bubble.animate().setListener(null)
                    listener.onClose()
                }
            }).start()
    }

    // ---- metrics ----

    private fun screenW(): Int = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        windowManager.maximumWindowMetrics.bounds.width()
    } else {
        context.resources.displayMetrics.widthPixels
    }

    private fun screenH(): Int = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        windowManager.maximumWindowMetrics.bounds.height()
    } else {
        context.resources.displayMetrics.heightPixels
    }

    private fun fontScale(): Float = min(context.resources.configuration.fontScale, MAX_FONT_SCALE)

    private fun dp(value: Int): Int = (value * density).toInt()

    companion object {
        private const val AUTO_COLLAPSE_MS = 8000L
        private const val TUCK_DELAY_MS = 1800L
        private const val MAX_FONT_SCALE = 1.3f
        private const val CLOSE_BOX_DP = 72
        private const val SPRING_BOUNCY = 0.65f
        private const val SPRING_SOFT = 0.9f
    }
}
