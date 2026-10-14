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
    private var bubbleClosing = false
    private var tucked = false
    private var dragging = false
    private var xSpring: SpringAnimation? = null
    private var ySpring: SpringAnimation? = null

    private var targetView: CloseTargetView? = null
    private var targetParams: WindowManager.LayoutParams? = null

    private var cardRoot: FrameLayout? = null
    private var cardView: ResultCardView? = null
    private var cardModel: CardModel? = null
    private var cardClosing = false
    private var resume: ResumeCard? = null
    private var snapToken = 0
    private var restX = 0
    private var restY = 0
    private var enterAnim: ObjectAnimator? = null
    private val machine = DragMachine(max(ViewConfiguration.get(context).scaledTouchSlop, dp(6)))
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
        presentCard(model)
        when (next) {
            State.SAFE -> {
                ShieldHaptics.safe(context)
                if (resume == null) main.postDelayed(autoCollapse, AUTO_COLLAPSE_MS)
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
        presentCard(
            CardModel(State.ERROR, chip, "Tap to retry", message, emptyList(), false, "$chip. $message. Double tap to retry.")
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
        if (!bubbleAttached) return
        if (machine.phase != DragMachine.Phase.DRAGGING) {
            val minY = dp(24)
            bubbleParams.x = restingX(onLeft, tucked)
            bubbleParams.y = bubbleParams.y.coerceIn(minY, max(minY, screenH() - bubbleSize - dp(48)))
            updateBubble()
        }
        if (machine.phase == DragMachine.Phase.SNAPPING) {
            snapToEdge()
            return
        }
        val model = cardModel
        val view = cardView
        if (cardRoot != null && !cardClosing && model != null && view != null && !dragging) {
            showCard(model, animate = false, expanded = view.isExpanded)
        }
    }

    private fun collapseSafeResult() {
        if (state == State.SAFE) listener.onDismiss()
    }

    private fun setState(next: State) {
        resume = null
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

    private fun presentCard(model: CardModel) {
        if (machine.phase == DragMachine.Phase.DRAGGING || machine.phase == DragMachine.Phase.SNAPPING) {
            cardModel = model
            resume = ResumeCard(model, false)
        } else {
            showCard(model, animate = true)
        }
    }

    private fun showCard(model: CardModel, animate: Boolean, expanded: Boolean = false) {
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
            FrameLayout.LayoutParams(view.collapsedWidth, FrameLayout.LayoutParams.WRAP_CONTENT, if (anchorFor(bubbleParams.x, bubbleParams.y).left) Gravity.START else Gravity.END)
        )
        if (expanded) view.setExpanded(true, false)
        val anchor = anchorFor(bubbleParams.x, bubbleParams.y)
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType,
            baseFlags,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = anchor.gravity
            x = 0
            y = anchor.offsetY
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
        enterAnim = ObjectAnimator.ofPropertyValuesHolder(
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

    private fun anchorFor(x: Int, y: Int) =
        AnchorMath.compute(x, y, bubbleSize, pad, dp(8), screenW(), screenH())

    /** Move the open card window to match the bubble. One layout pass, no per-frame work. */
    private fun reanchorCard() {
        val root = cardRoot ?: return
        if (machine.phase == DragMachine.Phase.DRAGGING || cardClosing) return
        val anchor = anchorFor(bubbleParams.x, bubbleParams.y)
        val params = root.layoutParams as? WindowManager.LayoutParams ?: return
        if (params.gravity == anchor.gravity && params.y == anchor.offsetY) return
        params.gravity = anchor.gravity
        params.y = anchor.offsetY
        (cardView?.layoutParams as? FrameLayout.LayoutParams)?.let {
            it.gravity = if (anchor.left) Gravity.START else Gravity.END
            cardView?.layoutParams = it
        }
        try {
            windowManager.updateViewLayout(root, params)
        } catch (_: Exception) {
        }
    }

    private fun aimPivotAtBubble(view: View) {
        val loc = IntArray(2)
        view.getLocationOnScreen(loc)
        view.pivotX = (bubbleParams.x + bubbleSize / 2f) - loc[0]
        view.pivotY = (bubbleParams.y + bubbleSize / 2f) - loc[1]
    }

    private fun dismissCard(animated: Boolean, duration: Long = 170) {
        val root = cardRoot ?: return
        val view = cardView
        if (!animated || view == null || cardClosing) {
            if (!animated) removeCardNow()
            return
        }
        cardClosing = true
        enterAnim?.cancel()
        enterAnim = null
        view.cancelAnimations()
        aimPivotAtBubble(view)
        main.postDelayed({ if (cardRoot === root) removeCardNow() }, duration + 80)
        view.animate().alpha(0f).scaleX(0.4f).scaleY(0.4f).setDuration(duration)
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
        enterAnim?.cancel()
        enterAnim = null
        cardView?.cancelAnimations()
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
        if (value == tucked || dragging || machine.phase != DragMachine.Phase.IDLE) return
        tucked = value
        springTo(xProperty, restingX(onLeft, value).toFloat(), SPRING_SOFT) { reanchorCard() }
    }

    private fun snapToEdge() {
        onLeft = bubbleCenterX() < screenW() / 2
        val minY = dp(24)
        val maxY = screenH() - bubbleSize - dp(48)
        tucked = false
        restX = restingX(onLeft, false)
        restY = bubbleParams.y.coerceIn(minY, max(minY, maxY))
        val token = ++snapToken
        springTo(xProperty, restX.toFloat(), SPRING_BOUNCY) { settle(token) }
        if (restY != bubbleParams.y) springTo(yProperty, restY.toFloat(), SPRING_SOFT)
        main.postDelayed({ settle(token) }, SETTLE_FALLBACK_MS)
        main.removeCallbacks(tuckLater)
        if (state == State.IDLE) main.postDelayed(tuckLater, TUCK_DELAY_MS)
    }

    /** The snap ended: bring the result card back at the new anchor. */
    private fun settle(token: Int) {
        if (token != snapToken || machine.phase == DragMachine.Phase.DRAGGING) return
        machine.settled()
        val pending = resume ?: return
        resume = null
        xSpring?.cancel()
        ySpring?.cancel()
        bubbleParams.x = restX
        bubbleParams.y = restY
        updateBubble()
        if (state == State.CHECKING || bubble.visibility != View.VISIBLE) return
        showCard(pending.model, animate = true, expanded = pending.expanded)
        if (state == State.SAFE && !pending.expanded) main.postDelayed(autoCollapse, AUTO_COLLAPSE_MS)
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
            if (onEnd != null) addEndListener { _, canceled, _, _ -> if (!canceled) onEnd() }
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
        private val longPress = Runnable {
            if (machine.longPress()) {
                ShieldHaptics.tick(context)
                closeBubble()
            }
        }

        override fun onTouch(v: View, event: MotionEvent): Boolean {
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    xSpring?.cancel()
                    ySpring?.cancel()
                    snapToken++
                    main.removeCallbacks(tuckLater)
                    startX = bubbleParams.x
                    startY = bubbleParams.y
                    touchX = event.rawX
                    touchY = event.rawY
                    machine.down()
                    main.postDelayed(longPress, ViewConfiguration.getLongPressTimeout().toLong() + 200)
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - touchX).toInt()
                    val dy = (event.rawY - touchY).toInt()
                    if (machine.move(dx, dy)) {
                        main.removeCallbacks(longPress)
                        beginDrag()
                    }
                    if (machine.phase == DragMachine.Phase.DRAGGING) followFinger(startX + dx, startY + dy)
                    return true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    main.removeCallbacks(longPress)
                    val released = event.actionMasked == MotionEvent.ACTION_UP
                    when (machine.up(released)) {
                        DragMachine.Outcome.TAP -> if (resume != null) snapToEdge() else v.performClick()
                        DragMachine.Outcome.NONE -> if (resume != null && !bubbleClosing) snapToEdge()
                        DragMachine.Outcome.SNAP -> endDrag(close = false)
                        DragMachine.Outcome.CLOSE -> endDrag(close = true)
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
        snapToken++
        main.removeCallbacks(autoCollapse)
        val model = cardModel
        val view = cardView
        if (resume == null && cardRoot != null && !cardClosing && model != null && view != null) {
            resume = ResumeCard(model, view.isExpanded)
        }
        dismissCard(animated = true, duration = 120)
        showTarget()
    }

    private fun followFinger(rawX: Int, rawY: Int) {
        val target = targetCenter()
        val cx = rawX + bubbleSize / 2f
        val cy = rawY + bubbleSize / 2f
        val near = hypot(cx - target.first, cy - target.second) < dp(84)
        if (near != machine.overTarget) {
            machine.overTarget = near
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

    private fun endDrag(close: Boolean) {
        dragging = false
        hideTarget()
        if (close) {
            resume = null
            cardModel = null
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
        bubbleClosing = true
        resume = null
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

    internal val bubbleViewForTest: View get() = bubble
    internal val screenForTest: Pair<Int, Int> get() = Pair(screenW(), screenH())
    internal val bubbleParamsForTest: WindowManager.LayoutParams get() = bubbleParams
    internal val hasCardWindow: Boolean get() = cardRoot != null
    internal val cardGravityForTest: Int? get() = (cardRoot?.layoutParams as? WindowManager.LayoutParams)?.gravity
    internal val isCardResumePending: Boolean get() = resume != null
    internal val dragPhase: DragMachine.Phase get() = machine.phase

    // ---- metrics ----

    private fun screenW(): Int {
        val w = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) windowManager.maximumWindowMetrics.bounds.width() else 0
        return if (w > 0) w else context.resources.displayMetrics.widthPixels
    }

    private fun screenH(): Int {
        val h = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) windowManager.maximumWindowMetrics.bounds.height() else 0
        return if (h > 0) h else context.resources.displayMetrics.heightPixels
    }

    private fun fontScale(): Float = min(context.resources.configuration.fontScale, MAX_FONT_SCALE)

    private fun dp(value: Int): Int = (value * density).toInt()

    companion object {
        private const val AUTO_COLLAPSE_MS = 8000L
        private const val TUCK_DELAY_MS = 1800L
        private const val SETTLE_FALLBACK_MS = 800L
        private const val MAX_FONT_SCALE = 1.3f
        private const val CLOSE_BOX_DP = 72
        private const val SPRING_BOUNCY = 0.65f
        private const val SPRING_SOFT = 0.9f
    }
}


internal data class CardAnchor(val below: Boolean, val left: Boolean, val offsetY: Int) {
    val gravity: Int
        get() = (if (below) Gravity.TOP else Gravity.BOTTOM) or (if (left) Gravity.START else Gravity.END)
}

/** Where the result window goes for a bubble window at (bubbleX, bubbleY). All values are pixels. */
internal object AnchorMath {
    fun compute(
        bubbleX: Int,
        bubbleY: Int,
        bubbleSize: Int,
        pad: Int,
        gap: Int,
        screenW: Int,
        screenH: Int
    ): CardAnchor {
        val centerX = bubbleX + bubbleSize / 2
        val centerY = bubbleY + bubbleSize / 2
        val left = centerX < screenW / 2
        val below = centerY < screenH / 2
        val circleTop = bubbleY + pad
        val circleBottom = bubbleY + bubbleSize - pad
        val offset = if (below) circleBottom + gap - pad else screenH - circleTop + gap - pad
        return CardAnchor(below, left, max(0, offset))
    }
}

/** Gesture phases of the bubble. Pure logic, so it is easy to test. */
internal class DragMachine(private val slop: Int) {
    enum class Phase { IDLE, PRESSED, DRAGGING, SNAPPING }
    enum class Outcome { NONE, TAP, SNAP, CLOSE }

    var phase = Phase.IDLE
        private set
    var overTarget = false

    fun down() {
        overTarget = false
        phase = Phase.PRESSED
    }

    /** Returns true once, when the finger passes the touch slop. */
    fun move(dx: Int, dy: Int): Boolean {
        if (phase == Phase.PRESSED && (abs(dx) > slop || abs(dy) > slop)) {
            phase = Phase.DRAGGING
            return true
        }
        return false
    }

    fun up(released: Boolean): Outcome = when (phase) {
        Phase.PRESSED -> {
            phase = Phase.IDLE
            if (released) Outcome.TAP else Outcome.NONE
        }
        Phase.DRAGGING -> {
            val close = released && overTarget
            overTarget = false
            phase = if (close) Phase.IDLE else Phase.SNAPPING
            if (close) Outcome.CLOSE else Outcome.SNAP
        }
        else -> Outcome.NONE
    }

    /** True when a long press fires without movement. */
    fun longPress(): Boolean {
        if (phase != Phase.PRESSED) return false
        phase = Phase.IDLE
        return true
    }

    /** The edge snap ended. True when the card may come back. */
    fun settled(): Boolean {
        if (phase != Phase.SNAPPING) return false
        phase = Phase.IDLE
        return true
    }
}

internal data class ResumeCard(val model: CardModel, val expanded: Boolean)
